use crate::tools::{searchable_tools, TOOLS_TREE};
use gloo_net::http::Request;
use leptos::*;
use serde::Deserialize;
use std::collections::HashSet;

const BLOG_SEARCH_INDEX_URL: &str = "https://blog.monkeytactics.com/menu-search.json";
const LOCAL_BLOG_SEARCH_INDEX_URL: &str = "http://localhost:1313/menu-search.json";

fn blog_search_index_url(hostname: &str) -> &'static str {
    if hostname == "127.0.0.1" || hostname == "localhost" {
        LOCAL_BLOG_SEARCH_INDEX_URL
    } else {
        BLOG_SEARCH_INDEX_URL
    }
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq)]
struct BlogItem {
    title: String,
    url: String,
    #[serde(default)]
    tags: Vec<String>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum SearchResultKind {
    Tool,
    Article,
}

impl SearchResultKind {
    fn label(self) -> &'static str {
        match self {
            Self::Tool => "Open tool",
            Self::Article => "Read guide",
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
struct SearchResult {
    id: String,
    label: String,
    url: String,
    kind: SearchResultKind,
}

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

fn keyboard_direction(key: &str) -> Option<i8> {
    match key {
        "ArrowDown" | "Down" => Some(1),
        "ArrowUp" | "Up" => Some(-1),
        _ => None,
    }
}

fn keyboard_event_direction(event: &web_sys::KeyboardEvent) -> Option<i8> {
    keyboard_direction(&event.key())
        .or_else(|| keyboard_direction(&event.code()))
        .or_else(|| match event.key_code() {
            40 => Some(1),
            38 => Some(-1),
            _ => None,
        })
}

fn text_match_score(value: &str, query: &str) -> Option<u8> {
    let normalized = value.to_lowercase();
    if normalized == query {
        Some(0)
    } else if normalized.starts_with(query) {
        Some(1)
    } else if normalized.contains(query) {
        Some(2)
    } else {
        None
    }
}

fn matching_results(query: &str, blog_items: &[BlogItem]) -> Vec<SearchResult> {
    let normalized = query.trim().to_lowercase();
    if normalized.is_empty() {
        return Vec::new();
    }

    let mut seen_urls = HashSet::new();
    let mut matches = Vec::new();

    for (position, tool) in searchable_tools().enumerate() {
        let score = text_match_score(tool.label, &normalized).or_else(|| {
            text_match_score(&tool.id.replace('-', " "), &normalized).map(|score| score + 1)
        });
        let Some(score) = score else {
            continue;
        };
        let destination = tool.url.split('#').next().unwrap_or(tool.url);
        if seen_urls.insert(destination.to_string()) {
            matches.push((
                0,
                score,
                position,
                SearchResult {
                    id: tool.id.to_string(),
                    label: tool.label.to_string(),
                    url: tool.url.to_string(),
                    kind: SearchResultKind::Tool,
                },
            ));
        }
    }

    for (position, article) in blog_items.iter().enumerate() {
        let title_score = text_match_score(&article.title, &normalized);
        let tag_score = article
            .tags
            .iter()
            .filter_map(|tag| text_match_score(tag, &normalized).map(|score| score + 2))
            .min();
        let Some(score) = title_score.into_iter().chain(tag_score).min() else {
            continue;
        };
        if seen_urls.insert(article.url.clone()) {
            matches.push((
                1,
                score,
                position,
                SearchResult {
                    id: format!("blog-{position}"),
                    label: article.title.clone(),
                    url: article.url.clone(),
                    kind: SearchResultKind::Article,
                },
            ));
        }
    }

    matches.sort_by_key(|(kind, score, position, _)| {
        (*kind, if *kind == 0 { 0 } else { *score }, *position)
    });
    matches
        .into_iter()
        .map(|(_, _, _, result)| result)
        .take(8)
        .collect()
}

#[component]
pub fn Header() -> impl IntoView {
    let (query, set_query) = create_signal(String::new());
    let (active_result, set_active_result) = create_signal(None::<usize>);
    let (mobile_open, set_mobile_open) = create_signal(false);
    let (blog_items, set_blog_items) = create_signal(Vec::<BlogItem>::new());
    let search_input = create_node_ref::<html::Input>();

    let results = create_memo(move |_| matching_results(&query.get(), &blog_items.get()));

    let blog_index_url = web_sys::window()
        .and_then(|window| window.location().hostname().ok())
        .map(|hostname| blog_search_index_url(&hostname))
        .unwrap_or(BLOG_SEARCH_INDEX_URL);
    spawn_local(async move {
        let Ok(response) = Request::get(blog_index_url).send().await else {
            return;
        };
        if !response.ok() {
            return;
        }
        if let Ok(items) = response.json::<Vec<BlogItem>>().await {
            set_blog_items.set(items);
        }
    });

    window_event_listener(ev::keydown, move |event| {
        let key = event.key();
        if let Some(direction) = keyboard_event_direction(&event) {
            let items = results.get();
            if query.get().trim().is_empty() || items.is_empty() {
                return;
            }

            event.prevent_default();
            let previous = active_result.get();
            let next = move_selection(previous, items.len(), direction);
            set_active_result.set(next);
            if let Some(input) = search_input.get() {
                let _ = input.focus();
            }
            return;
        }

        match key.as_str() {
            "Escape" => {
                set_mobile_open.set(false);
                set_query.set(String::new());
                set_active_result.set(None);
            }
            "Enter" if !query.get().trim().is_empty() => {
                let items = results.get();
                if let Some(result) = active_result
                    .get()
                    .and_then(|index| items.get(index).cloned())
                {
                    event.prevent_default();
                    if let Some(window) = web_sys::window() {
                        let _ = window.location().set_href(&result.url);
                    }
                }
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
        }
    });

    view! {
        <header class="mt-header">
            <a class="mt-brand" href="/" aria-label="MonkeyTactics home">
                <img
                    class="mt-brand-logo"
                    src="/assets/images/logo/monkeytactics-monkey-logo.png"
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
                    placeholder="Search tools and guides"
                    aria-label="Search MonkeyTactics tools and guides"
                    aria-controls="mt-search-results"
                    aria-autocomplete="list"
                    aria-expanded=move || (!query.get().trim().is_empty()).to_string()
                    aria-activedescendant=move || active_result
                        .get()
                        .and_then(|index| results.get().get(index).map(|result| format!("mt-search-option-{}", result.id)))
                        .unwrap_or_default()
                    prop:value=move || query.get()
                    on:input=move |event| {
                        let value = event_target_value(&event);
                        set_query.set(value);
                        set_active_result.set(None);
                    }
                />
                <kbd aria-label="Keyboard shortcut">"/"</kbd>

                <Show when=move || !query.get().trim().is_empty()>
                    <div id="mt-search-results" class="mt-search-results" role="listbox">
                        <Show
                            when=move || !results.get().is_empty()
                            fallback=|| view! { <p class="mt-search-empty">"No matching tools or guides"</p> }
                        >
                            <For
                                each=move || {
                                    let active = active_result.get();
                                    results
                                        .get()
                                        .into_iter()
                                        .enumerate()
                                        .map(|(index, result)| (index, result, active == Some(index)))
                                        .collect::<Vec<_>>()
                                }
                                key=|(_, result, is_active)| (result.id.clone(), *is_active)
                                children=move |(index, result, is_active)| {
                                    let result_id = result.id.clone();
                                    let result_url = result.url.clone();
                                    let result_label = result.label.clone();
                                    let result_kind = result.kind.label();
                                    let result_class = match (result.kind, is_active) {
                                        (SearchResultKind::Article, true) => "mt-guide-result active",
                                        (SearchResultKind::Article, false) => "mt-guide-result",
                                        (SearchResultKind::Tool, true) => "mt-tool-result active",
                                        (SearchResultKind::Tool, false) => "mt-tool-result",
                                    };
                                    view! {
                                    <a
                                        id=format!("mt-search-option-{result_id}")
                                        href=result_url.clone()
                                        role="option"
                                        class=result_class
                                        aria-selected=is_active.to_string()
                                        on:focus=move |_| set_active_result.set(Some(index))
                                    >
                                        <span>{result_label}</span>
                                        <small>{result_kind}</small>
                                    </a>
                                }}
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
    use super::{
        blog_search_index_url, keyboard_direction, matching_results, move_selection, BlogItem,
        SearchResultKind, BLOG_SEARCH_INDEX_URL, LOCAL_BLOG_SEARCH_INDEX_URL,
    };

    #[test]
    fn local_sites_use_the_local_hugo_search_index() {
        assert_eq!(
            blog_search_index_url("127.0.0.1"),
            LOCAL_BLOG_SEARCH_INDEX_URL
        );
        assert_eq!(
            blog_search_index_url("localhost"),
            LOCAL_BLOG_SEARCH_INDEX_URL
        );
        assert_eq!(
            blog_search_index_url("monkeytactics.com"),
            BLOG_SEARCH_INDEX_URL
        );
    }

    #[test]
    fn keyboard_directions_accept_standard_and_legacy_key_names() {
        assert_eq!(keyboard_direction("ArrowDown"), Some(1));
        assert_eq!(keyboard_direction("Down"), Some(1));
        assert_eq!(keyboard_direction("ArrowUp"), Some(-1));
        assert_eq!(keyboard_direction("Up"), Some(-1));
        assert_eq!(keyboard_direction("Enter"), None);
    }

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
    fn a_single_tool_search_returns_the_expected_result() {
        let matches = matching_results("tip", &[]);
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].id, "tip-calculator");
    }

    #[test]
    fn search_results_are_unique_by_destination_page() {
        let matches = matching_results("qr", &[]);
        let ids = matches
            .iter()
            .map(|result| result.id.as_str())
            .collect::<Vec<_>>();

        assert_eq!(ids, ["qr-code-generator", "qr-code-decoder"]);
    }

    #[test]
    fn blog_tags_are_searchable_and_return_guides() {
        let articles = vec![BlogItem {
            title: "Build More Reliable Codes".into(),
            url: "https://blog.monkeytactics.com/posts/reliable-codes/".into(),
            tags: vec!["qr code reliability".into(), "printing".into()],
        }];

        let matches = matching_results("printing", &articles);

        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].kind, SearchResultKind::Article);
        assert_eq!(matches[0].url, articles[0].url);
    }
}
