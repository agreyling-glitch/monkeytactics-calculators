use crate::tools::{searchable_tools, ToolItem};
use gloo_net::http::Request;
use leptos::*;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

const BLOG_SEARCH_INDEX_URL: &str = "https://blog.monkeytactics.com/menu-search.json";
const LOCAL_BLOG_SEARCH_INDEX_URL: &str = "http://localhost:1313/menu-search.json";
const TOOLS_MANIFEST_URL: &str = "/assets/wasm/menu/tools-manifest.json";
const FAVORITES_STORAGE_KEY: &str = "monkeytactics.menu-favorites";
const FAVORITES_VERSION: u8 = 1;
const MAX_FAVORITES: usize = 12;

#[derive(Debug, Default, Deserialize, Serialize)]
struct FavoriteState {
    version: u8,
    tool_ids: Vec<String>,
}

fn normalized_favorites(tool_ids: Vec<String>) -> Vec<String> {
    let mut seen = HashSet::new();
    tool_ids
        .into_iter()
        .filter(|id| !id.is_empty() && seen.insert(id.clone()))
        .take(MAX_FAVORITES)
        .collect()
}

fn load_favorites() -> Vec<String> {
    web_sys::window()
        .and_then(|window| window.local_storage().ok().flatten())
        .and_then(|storage| storage.get_item(FAVORITES_STORAGE_KEY).ok().flatten())
        .and_then(|json| serde_json::from_str::<FavoriteState>(&json).ok())
        .filter(|state| state.version == FAVORITES_VERSION)
        .map(|state| normalized_favorites(state.tool_ids))
        .unwrap_or_default()
}

fn save_favorites(tool_ids: &[String]) {
    let state = FavoriteState {
        version: FAVORITES_VERSION,
        tool_ids: tool_ids.to_vec(),
    };
    let Ok(json) = serde_json::to_string(&state) else {
        return;
    };
    if let Some(storage) =
        web_sys::window().and_then(|window| window.local_storage().ok().flatten())
    {
        let _ = storage.set_item(FAVORITES_STORAGE_KEY, &json);
    }
}

fn toggle_favorite(tool_id: &str, favorites: &mut Vec<String>) {
    if let Some(index) = favorites.iter().position(|id| id == tool_id) {
        favorites.remove(index);
    } else if favorites.len() < MAX_FAVORITES {
        favorites.push(tool_id.to_string());
    }
}

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

fn tool_aliases(tool_id: &str) -> &'static [&'static str] {
    match tool_id {
        "words-with-friends-solver" => &["wwf", "words with friends word finder"],
        _ => &[],
    }
}

fn search_tokens(value: &str) -> Vec<String> {
    const STOP_WORDS: &[&str] = &["a", "an", "and", "for", "from", "of", "the", "to", "with"];
    value
        .to_lowercase()
        .split(|character: char| !character.is_alphanumeric())
        .filter(|token| token.len() > 1 && !STOP_WORDS.contains(token))
        .map(|token| token.to_string())
        .collect()
}

fn tool_search_text(tool: &ToolItem) -> String {
    format!(
        "{} {} {} {} {}",
        tool.label,
        tool.id.replace('-', " "),
        tool.description,
        tool.keywords.join(" "),
        tool_aliases(&tool.id).join(" ")
    )
}

fn levenshtein_distance(left: &str, right: &str) -> usize {
    let mut previous = (0..=right.chars().count()).collect::<Vec<_>>();
    for (left_index, left_character) in left.chars().enumerate() {
        let mut current = vec![left_index + 1];
        for (right_index, right_character) in right.chars().enumerate() {
            current.push(
                (current[right_index] + 1)
                    .min(previous[right_index + 1] + 1)
                    .min(previous[right_index] + usize::from(left_character != right_character)),
            );
        }
        previous = current;
    }
    previous[right.chars().count()]
}

fn tf_idf_scores(query_tokens: &[String], documents: &[Vec<String>]) -> Vec<f64> {
    let mut document_frequency = HashMap::<&str, usize>::new();
    for document in documents {
        let unique = document.iter().map(String::as_str).collect::<HashSet<_>>();
        for token in unique {
            *document_frequency.entry(token).or_default() += 1;
        }
    }

    let document_count = documents.len() as f64;
    documents
        .iter()
        .map(|document| {
            let vocabulary = query_tokens
                .iter()
                .chain(document.iter())
                .map(String::as_str)
                .collect::<HashSet<_>>();
            let mut dot = 0.0;
            let mut query_norm = 0.0;
            let mut document_norm = 0.0;
            for token in vocabulary {
                let idf = ((document_count + 1.0)
                    / (*document_frequency.get(token).unwrap_or(&0) as f64 + 1.0))
                    .ln()
                    + 1.0;
                let query_weight = query_tokens
                    .iter()
                    .filter(|item| item.as_str() == token)
                    .count() as f64
                    * idf;
                let document_weight = document
                    .iter()
                    .filter(|item| item.as_str() == token)
                    .count() as f64
                    * idf;
                dot += query_weight * document_weight;
                query_norm += query_weight * query_weight;
                document_norm += document_weight * document_weight;
            }
            if query_norm == 0.0 || document_norm == 0.0 {
                0.0
            } else {
                dot / (query_norm.sqrt() * document_norm.sqrt())
            }
        })
        .collect()
}

fn tool_relevance(
    tool: &ToolItem,
    normalized_query: &str,
    query_tokens: &[String],
    document_tokens: &[String],
    cosine_similarity: f64,
) -> Option<i32> {
    let label = tool.label.to_lowercase();
    let id = tool.id.replace('-', " ").to_lowercase();
    let keywords = tool
        .keywords
        .iter()
        .map(|keyword| keyword.to_lowercase())
        .collect::<Vec<_>>();
    let mut score = (cosine_similarity * 2_000.0).round() as i32;

    if label == normalized_query || keywords.iter().any(|keyword| keyword == normalized_query) {
        score += 10_000;
    } else if label.starts_with(normalized_query) || id.starts_with(normalized_query) {
        score += 8_000;
    } else if label.contains(normalized_query)
        || id.contains(normalized_query)
        || keywords
            .iter()
            .any(|keyword| keyword.contains(normalized_query))
    {
        score += 6_000;
    }

    let all_tokens_match = !query_tokens.is_empty()
        && query_tokens
            .iter()
            .all(|query_token| document_tokens.contains(query_token));
    if all_tokens_match {
        score += 4_000;
    }

    let fuzzy_matches = query_tokens
        .iter()
        .filter(|query_token| {
            query_token.len() >= 4
                && document_tokens.iter().any(|document_token| {
                    document_token.len().abs_diff(query_token.len()) <= 1
                        && levenshtein_distance(query_token, document_token) <= 1
                })
        })
        .count();
    score += fuzzy_matches as i32 * 150;

    (score > 0).then_some(score)
}

fn matching_results_with_favorites(
    query: &str,
    tools_tree: &[ToolItem],
    blog_items: &[BlogItem],
    favorite_ids: &[String],
) -> Vec<SearchResult> {
    let normalized = query.trim().to_lowercase();
    if normalized.is_empty() {
        return Vec::new();
    }

    let mut matches = Vec::new();
    let tools = searchable_tools(tools_tree);
    let query_tokens = search_tokens(&normalized);
    let document_tokens = tools
        .iter()
        .map(|tool| search_tokens(&tool_search_text(tool)))
        .collect::<Vec<_>>();
    let cosine_scores = tf_idf_scores(&query_tokens, &document_tokens);

    for (position, tool) in tools.into_iter().enumerate() {
        let score = tool_relevance(
            tool,
            &normalized,
            &query_tokens,
            &document_tokens[position],
            cosine_scores[position],
        );
        let Some(mut score) = score else {
            continue;
        };
        if favorite_ids.contains(&tool.id) {
            score += 250;
        }
        matches.push((
            score,
            0,
            position,
            SearchResult {
                id: tool.id.clone(),
                label: tool.label.clone(),
                url: tool.url.clone(),
                kind: SearchResultKind::Tool,
            },
        ));
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
        matches.push((
            5_000 - score as i32,
            1,
            position,
            SearchResult {
                id: format!("blog-{position}"),
                label: article.title.clone(),
                url: article.url.clone(),
                kind: SearchResultKind::Article,
            },
        ));
    }

    matches.sort_by_key(|(score, kind, position, _)| (std::cmp::Reverse(*score), *kind, *position));
    let mut seen_destinations = HashSet::new();
    matches
        .into_iter()
        .filter_map(|(_, _, _, result)| {
            let destination = result
                .url
                .split('#')
                .next()
                .unwrap_or(&result.url)
                .to_string();
            seen_destinations.insert(destination).then_some(result)
        })
        .take(8)
        .collect()
}

#[cfg(test)]
fn matching_results(
    query: &str,
    tools_tree: &[ToolItem],
    blog_items: &[BlogItem],
) -> Vec<SearchResult> {
    matching_results_with_favorites(query, tools_tree, blog_items, &[])
}

#[component]
fn ToolRow(
    tool: ToolItem,
    favorite_ids: ReadSignal<Vec<String>>,
    set_favorite_ids: WriteSignal<Vec<String>>,
) -> impl IntoView {
    let tool_id = tool.id.clone();
    let tool_id_for_state = tool.id.clone();
    let tool_label = tool.label.clone();
    let favorite_label = tool.label.clone();
    let is_favorite = create_memo(move |_| favorite_ids.get().contains(&tool_id_for_state));

    view! {
        <div class="mt-tool-row">
            <a href=tool.url>{tool_label}</a>
            <button
                class="mt-favorite-toggle"
                type="button"
                aria-label=move || if is_favorite.get() {
                    format!("Remove {favorite_label} from favorites")
                } else {
                    format!("Add {favorite_label} to favorites")
                }
                aria-pressed=move || is_favorite.get().to_string()
                title=move || if is_favorite.get() { "Remove from favorites" } else { "Add to favorites" }
                on:click=move |_| {
                    set_favorite_ids.update(|favorites| {
                        toggle_favorite(&tool_id, favorites);
                        save_favorites(favorites);
                    });
                }
            >{move || if is_favorite.get() { "★" } else { "☆" }}</button>
        </div>
    }
}

#[component]
pub fn Header() -> impl IntoView {
    let (query, set_query) = create_signal(String::new());
    let (active_result, set_active_result) = create_signal(None::<usize>);
    let (mobile_open, set_mobile_open) = create_signal(false);
    let (blog_items, set_blog_items) = create_signal(Vec::<BlogItem>::new());
    let (tools_tree, set_tools_tree) = create_signal(Vec::<ToolItem>::new());
    let (favorite_ids, set_favorite_ids) = create_signal(load_favorites());
    let search_input = create_node_ref::<html::Input>();

    let results = create_memo(move |_| {
        matching_results_with_favorites(
            &query.get(),
            &tools_tree.get(),
            &blog_items.get(),
            &favorite_ids.get(),
        )
    });
    let favorite_tools = create_memo(move |_| {
        let tree = tools_tree.get();
        let favorites = favorite_ids.get();
        searchable_tools(&tree)
            .into_iter()
            .filter(|tool| favorites.contains(&tool.id))
            .cloned()
            .collect::<Vec<_>>()
    });

    spawn_local(async move {
        let Ok(response) = Request::get(TOOLS_MANIFEST_URL).send().await else {
            return;
        };
        if !response.ok() {
            return;
        }
        if let Ok(items) = response.json::<Vec<ToolItem>>().await {
            set_tools_tree.set(items);
        }
    });

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
                class:open=move || mobile_open.get()
                type="button"
                aria-label=move || if mobile_open.get() { "Close tools menu" } else { "Open tools menu" }
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
            <Show when=move || !favorite_tools.get().is_empty()>
                <section class="mt-favorites" aria-label="Favorite tools">
                    <div class="mt-favorites-heading">
                        <strong>"Favorites"</strong>
                        <span>{move || favorite_tools.get().len()}</span>
                    </div>
                    <div class="mt-favorites-list">
                        {move || favorite_tools.get().into_iter().map(|tool| view! {
                            <ToolRow tool=tool favorite_ids=favorite_ids set_favorite_ids=set_favorite_ids/>
                        }).collect_view()}
                    </div>
                </section>
            </Show>
            {move || tools_tree.get().into_iter().map(|group| view! {
                <details>
                    <summary>{group.label.clone()}<span>{group.leaf_count()}</span></summary>
                    <div>
                        {group.children.into_iter().map(|item| {
                            if item.children.is_empty() {
                                view! {
                                    <ToolRow tool=item favorite_ids=favorite_ids set_favorite_ids=set_favorite_ids/>
                                }.into_view()
                            } else {
                                view! {
                                    <section class="mt-drawer-subgroup">
                                        <strong>{item.label}</strong>
                                        {item.children.into_iter().map(|tool| view! {
                                            <ToolRow tool=tool favorite_ids=favorite_ids set_favorite_ids=set_favorite_ids/>
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
        blog_search_index_url, keyboard_direction, matching_results, move_selection,
        normalized_favorites, toggle_favorite, BlogItem, SearchResultKind, BLOG_SEARCH_INDEX_URL,
        LOCAL_BLOG_SEARCH_INDEX_URL, MAX_FAVORITES,
    };
    use crate::tools::ToolItem;

    fn tools_tree() -> Vec<ToolItem> {
        serde_json::from_str(include_str!(
            "../../../assets/wasm/menu/tools-manifest.json"
        ))
        .expect("valid tools manifest")
    }

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
        let matches = matching_results("tip", &tools_tree(), &[]);
        assert_eq!(
            matches.first().map(|result| result.id.as_str()),
            Some("tip-calculator")
        );
    }

    #[test]
    fn tool_aliases_return_the_words_with_friends_solver() {
        let matches = matching_results("wwf", &tools_tree(), &[]);
        assert_eq!(matches.len(), 1);
        assert_eq!(matches[0].id, "words-with-friends-solver");
        assert_eq!(matches[0].url, "/tools/words-with-friends-solver");
    }

    #[test]
    fn intent_phrases_rank_the_expected_tools_first() {
        for (query, expected_id) in [
            ("mortgage compare", "mortgage-comparison"),
            ("qr colors", "qr-code-generator"),
            ("days between dates", "date-difference-calculator"),
            ("read text from photo", "ocr-utility"),
            ("100 passwords", "batch-password-generator"),
        ] {
            let matches = matching_results(query, &tools_tree(), &[]);
            assert_eq!(
                matches.first().map(|result| result.id.as_str()),
                Some(expected_id),
                "query: {query}"
            );
        }
    }

    #[test]
    fn minor_search_typos_still_find_the_expected_tool() {
        let matches = matching_results("mortage compare", &tools_tree(), &[]);
        assert_eq!(
            matches.first().map(|result| result.id.as_str()),
            Some("mortgage-comparison")
        );
    }

    #[test]
    fn favorites_are_unique_versionable_ids_capped_at_the_limit() {
        let ids = (0..MAX_FAVORITES + 3)
            .map(|index| format!("tool-{index}"))
            .chain(["tool-0".to_string(), String::new()])
            .collect();
        let favorites = normalized_favorites(ids);
        assert_eq!(favorites.len(), MAX_FAVORITES);
        assert_eq!(favorites[0], "tool-0");
    }

    #[test]
    fn favorite_toggle_adds_and_removes_stable_tool_ids() {
        let mut favorites = vec!["paint-calculator".to_string()];
        toggle_favorite("qr-code-generator", &mut favorites);
        assert_eq!(favorites, ["paint-calculator", "qr-code-generator"]);
        toggle_favorite("paint-calculator", &mut favorites);
        assert_eq!(favorites, ["qr-code-generator"]);
    }

    #[test]
    fn search_results_are_unique_by_destination_page() {
        let matches = matching_results("qr", &tools_tree(), &[]);
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

        let matches = matching_results("printing", &tools_tree(), &articles);

        assert_eq!(matches[0].kind, SearchResultKind::Article);
        assert_eq!(matches[0].url, articles[0].url);
    }
}
