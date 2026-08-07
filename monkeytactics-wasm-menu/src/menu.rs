use crate::tools::{searchable_tools, ToolItem, TOOLS_TREE};
use leptos::*;
use wasm_bindgen::JsCast;
use web_sys::HtmlElement;

fn move_selection(current: Option<usize>, result_count: usize, direction: i8) -> Option<usize> {
    if result_count == 0 {
        return None;
    }

    match (current, direction) {
        (Some(index), direction) if direction < 0 => Some(if index == 0 {
            result_count - 1
        } else {
            index - 1
        }),
        (Some(index), _) => Some((index + 1) % result_count),
        (None, direction) if direction < 0 => Some(result_count - 1),
        (None, _) => Some(0),
    }
}

fn matching_tools(query: &str) -> Vec<&'static ToolItem> {
    let normalized = query.trim().to_lowercase();
    if normalized.is_empty() {
        return Vec::new();
    }

    searchable_tools()
        .filter(|tool| {
            tool.label.to_lowercase().contains(&normalized)
                || tool.id.replace('-', " ").contains(&normalized)
        })
        .take(8)
        .collect()
}

fn focus_result(tool: &ToolItem) {
    let Some(document) = web_sys::window().and_then(|window| window.document()) else {
        return;
    };
    let Some(element) = document.get_element_by_id(&format!("mt-search-option-{}", tool.id)) else {
        return;
    };
    let Ok(element) = element.dyn_into::<HtmlElement>() else {
        return;
    };
    let _ = element.focus();
}

#[component]
pub fn Header() -> impl IntoView {
    let (query, set_query) = create_signal(String::new());
    let (active_result, set_active_result) = create_signal(None::<usize>);
    let (mobile_open, set_mobile_open) = create_signal(false);
    let search_input = create_node_ref::<html::Input>();

    let results = create_memo(move |_| matching_tools(&query.get()));

    window_event_listener(ev::keydown, move |event| match event.key().as_str() {
        "Escape" => {
            set_mobile_open.set(false);
            set_query.set(String::new());
            set_active_result.set(None);
        }
        "/" if !event.ctrl_key() && !event.meta_key() && !event.alt_key() => {
            let is_typing = web_sys::window()
                .and_then(|window| window.document())
                .and_then(|document| document.active_element())
                .map(|element| {
                    matches!(element.tag_name().as_str(), "INPUT" | "TEXTAREA" | "SELECT")
                })
                .unwrap_or(false);

            if !is_typing {
                event.prevent_default();
                if let Some(input) = search_input.get() {
                    let _ = input.focus();
                }
            }
        }
        _ => {}
    });

    view! {
        <header class="mt-header">
            <a class="mt-brand" href="/" aria-label="MonkeyTactics home">
                <img
                    class="mt-brand-logo"
                    src="/assets/img/logo/monkeytactics-monkey-logo.png"
                    alt="MonkeyTactics logo"
                    width="52"
                    height="52"
                />
                <span class="mt-brand-copy">
                    <strong>"MonkeyTactics"</strong>
                    <small>"Free calculators & tools"</small>
                </span>
            </a>

            <div class="mt-search" role="search">
                <span class="mt-search-icon" aria-hidden="true">"⌕"</span>
                <input
                    node_ref=search_input
                    type="search"
                    role="combobox"
                    placeholder="Search all tools"
                    aria-label="Search all MonkeyTactics tools"
                    aria-controls="mt-search-results"
                    aria-autocomplete="list"
                    aria-expanded=move || (!query.get().trim().is_empty()).to_string()
                    aria-activedescendant=move || active_result
                        .get()
                        .and_then(|index| results.get().get(index).map(|tool| format!("mt-search-option-{}", tool.id)))
                        .unwrap_or_default()
                    prop:value=move || query.get()
                    on:input=move |event| {
                        let value = event_target_value(&event);
                        let next_active = (matching_tools(&value).len() == 1).then_some(0);
                        set_query.set(value);
                        set_active_result.set(next_active);
                    }
                    on:keydown=move |event| {
                        let items = results.get();
                        match event.key().as_str() {
                            "ArrowDown" => {
                                event.prevent_default();
                                let next = move_selection(active_result.get(), items.len(), 1);
                                set_active_result.set(next);
                                if let Some(tool) = next.and_then(|index| items.get(index)) {
                                    focus_result(tool);
                                }
                            }
                            "ArrowUp" => {
                                event.prevent_default();
                                let next = move_selection(active_result.get(), items.len(), -1);
                                set_active_result.set(next);
                                if let Some(tool) = next.and_then(|index| items.get(index)) {
                                    focus_result(tool);
                                }
                            }
                            "Enter" => {
                                if let Some(tool) = active_result
                                    .get()
                                    .and_then(|index| items.get(index).copied())
                                {
                                    event.prevent_default();
                                    if let Some(window) = web_sys::window() {
                                        let _ = window.location().set_href(tool.url);
                                    }
                                }
                            }
                            _ => {}
                        }
                    }
                />
                <kbd aria-label="Keyboard shortcut">"/"</kbd>

                <Show when=move || !query.get().trim().is_empty()>
                    <div id="mt-search-results" class="mt-search-results" role="listbox">
                        <Show
                            when=move || !results.get().is_empty()
                            fallback=|| view! { <p class="mt-search-empty">"No matching tools"</p> }
                        >
                            <For
                                each=move || {
                                    results.get().into_iter().enumerate().collect::<Vec<_>>()
                                }
                                key=|(_, tool)| tool.id
                                children=move |(index, tool)| view! {
                                    <a
                                        id=format!("mt-search-option-{}", tool.id)
                                        href=tool.url
                                        role="option"
                                        aria-selected=move || (active_result.get() == Some(index)).to_string()
                                        class:active=move || active_result.get() == Some(index)
                                        on:mouseenter=move |_| set_active_result.set(Some(index))
                                        on:focus=move |_| set_active_result.set(Some(index))
                                        on:keydown=move |event| {
                                            if event.key() == "Enter" {
                                                event.prevent_default();
                                                if let Some(window) = web_sys::window() {
                                                    let _ = window.location().set_href(tool.url);
                                                }
                                                return;
                                            }

                                            let items = results.get();
                                            let direction = match event.key().as_str() {
                                                "ArrowDown" => 1,
                                                "ArrowUp" => -1,
                                                _ => return,
                                            };
                                            event.prevent_default();
                                            let next = move_selection(Some(index), items.len(), direction);
                                            set_active_result.set(next);
                                            if let Some(tool) = next.and_then(|next_index| items.get(next_index)) {
                                                focus_result(tool);
                                            }
                                        }
                                    >
                                        <span>{tool.label}</span>
                                        <small>"Open tool"</small>
                                    </a>
                                }
                            />
                        </Show>
                    </div>
                </Show>
            </div>

            <button
                class="mt-hamburger"
                type="button"
                aria-label="Open tools menu"
                aria-controls="mt-mobile-drawer"
                aria-expanded=move || mobile_open.get().to_string()
                on:click=move |_| set_mobile_open.update(|open| *open = !*open)
            >
                <span></span><span></span><span></span>
            </button>

        </header>

        <div
            class="mt-drawer-backdrop"
            class:open=move || mobile_open.get()
            aria-hidden="true"
            on:click=move |_| set_mobile_open.set(false)
        ></div>

        <aside
            id="mt-mobile-drawer"
            class="mt-mobile-drawer"
            class:open=move || mobile_open.get()
            aria-label="Mobile tools menu"
            aria-hidden=move || (!mobile_open.get()).to_string()
        >
            <div class="mt-drawer-heading">
                <strong>"Explore tools"</strong>
                <button
                    type="button"
                    aria-label="Close tools menu"
                    on:click=move |_| set_mobile_open.set(false)
                >"×"</button>
            </div>
            <a class="mt-drawer-all" href="/tools">"View all tools"</a>
            {TOOLS_TREE.iter().map(|group| view! {
                <details>
                    <summary>{group.label}<span>{group.leaf_count()}</span></summary>
                    <div>
                        {group.children.iter().map(|item| {
                            if item.children.is_empty() {
                                view! { <a href=item.url>{item.label}</a> }.into_view()
                            } else {
                                view! {
                                    <section class="mt-drawer-subgroup">
                                        <strong>{item.label}</strong>
                                        {item.children.iter().map(|tool| view! {
                                            <a href=tool.url>{tool.label}</a>
                                        }).collect_view()}
                                    </section>
                                }.into_view()
                            }
                        }).collect_view()}
                    </div>
                </details>
            }).collect_view()}
        </aside>
    }
}

#[cfg(test)]
mod tests {
    use super::{matching_tools, move_selection};

    #[test]
    fn keyboard_selection_wraps_in_both_directions() {
        assert_eq!(move_selection(None, 3, 1), Some(0));
        assert_eq!(move_selection(Some(2), 3, 1), Some(0));
        assert_eq!(move_selection(None, 3, -1), Some(2));
        assert_eq!(move_selection(Some(0), 3, -1), Some(2));
    }

    #[test]
    fn keyboard_selection_ignores_empty_results() {
        assert_eq!(move_selection(None, 0, 1), None);
        assert_eq!(move_selection(Some(0), 0, -1), None);
    }

    #[test]
    fn keyboard_selection_keeps_a_single_result_selected() {
        assert_eq!(move_selection(None, 1, 1), Some(0));
        assert_eq!(move_selection(None, 1, -1), Some(0));
        assert_eq!(move_selection(Some(0), 1, 1), Some(0));
        assert_eq!(move_selection(Some(0), 1, -1), Some(0));
    }

    #[test]
    fn a_single_search_match_can_be_activated_immediately() {
        let matches = matching_tools("tip");
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].id, "tip-calculator");
    }
}
