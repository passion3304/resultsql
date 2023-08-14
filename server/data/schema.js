const typeDefs = `

  type Category {
    id: String
    cid: String
    detail: String
    label: String
    level: String
    parent_id: String
    top_category_id: String
    count: String
    count_winner: String
    count_today: String
    count_today_coming_live: String
    count_3h: String
    count_24h: String
    count_3d: String
    count_1w: String
    count_live: String
    count_live_now: String
    count_liveopen: String
    count_live_today: String
    count_live_3h: String
    count_live_24h: String
    count_live_3d: String
    count_live_1w: String
    count_1_days_ago: String
    count_2_days_ago: String
    count_3_days_ago: String
    count_4_days_ago: String
    count_5_days_ago: String
    count_6_days_ago: String
    count_7_days_ago: String
    count_1_days_forward: String
    count_1_days_forward_live: String
    count_2_days_forward: String
    count_2_days_forward_live: String
    count_3_days_forward: String
    count_3_days_forward_live: String
    count_4_days_forward: String
    count_4_days_forward_live: String
    count_5_days_forward: String
    count_5_days_forward_live: String
    count_6_days_forward: String
    count_6_days_forward_live: String
    count_7_days_forward: String
    count_7_days_forward_live: String
    path: String
    mergedTree: [String]
    is_highlights: Boolean
    is_longterm_highlights: Boolean
    is_only_longterm: Boolean
    is_only_regular: Boolean
    weight: Int
  }
  
  type NestedCategory {
    id: String
    cid: String
    detail: String
    label: String
    level: String
    parent_id: String
    top_category_id: String
    count: String
    count_winner: String
    count_today: String
    count_today_coming_live: String
    count_3h: String
    count_24h: String
    count_3d: String
    count_1w: String
    count_live: String
    count_live_now: String
    count_liveopen: String
    count_live_today: String
    count_live_3h: String
    count_live_24h: String
    count_live_3d: String
    count_live_1w: String
    count_1_days_ago: String
    count_2_days_ago: String
    count_3_days_ago: String
    count_4_days_ago: String
    count_5_days_ago: String
    count_6_days_ago: String
    count_7_days_ago: String
    count_1_days_forward: String
    count_1_days_forward_live: String
    count_2_days_forward: String
    count_2_days_forward_live: String
    count_3_days_forward: String
    count_3_days_forward_live: String
    count_4_days_forward: String
    count_4_days_forward_live: String
    count_5_days_forward: String
    count_5_days_forward_live: String
    count_6_days_forward: String
    count_6_days_forward_live: String
    count_7_days_forward: String
    count_7_days_forward_live: String
    path: String
    count_subcat: String
    mergedTree: [String]
    children: [NestedCategory]
    is_highlights: Boolean
    is_longterm_highlights: Boolean
    is_only_longterm: Boolean
    is_only_regular: Boolean
    weight: Int
  }
  
  type Categories {
    categories: [NestedCategory]
    not_filtered: Boolean
  }
  
  type Child {
    detail: String
    path: String
    level: String
    maincat: String
    id: String
    count_subcat: String
    count_events: String
  }
  
  type Tree {
    parent_name: String
    parent_id: String
    count: String
    counttoday: String
    countall: String
    count24h: String
    items: [Child]
  }

  type ResultItemCategoryLabel {
    de: String
    en: String
  }
  
  type ResultItemCategory {
    id: String
    label: ResultItemCategoryLabel
    topcatid: String
  }

  type ResultItemTeam {
    id: String
    label: String
  }

  type ResultItemTeams {
    home: ResultItemTeam
    away: ResultItemTeam
  }

  type ResultItemPeriod {
    type: String,
    data: [Int]
  }

  type ResultItemJSONData {
    periods: [ResultItemPeriod]
    winner: Int
    score_str: String
  }

  type ResultItemJSON {
    label: String
    cancelled: String
    version: Int
    eid: Int
    data: ResultItemJSONData
  }
  
  type ResultItem {
    id: String
    bid: String
    expires_ts: String
    cid: String
    category_path: ResultItemCategoryLabel
    cats: [ResultItemCategory]
    teams: ResultItemTeams
    json: ResultItemJSON
    label: ResultItemCategoryLabel
    mergedTree: [String]
  }

  enum filterByType {
    EVENT
    CATEGORY
    BETRADAR
  }

  type Schedule {
    date_label: String
    date: String
    start: String
    end: String
    count: String
  }

  type EventSchedule {
    dates: [Schedule]
  }
  
  type CategoriesSearchResultListItem {
    id: String
    label: String
    top_category_id: String
  }

  type Query {
   category(lang:String, id: String): Category
   categories(lang: String, filter: String): Categories
   mergedCategories(lang: String, filter: String): Categories
   categoriesByIds(lang: String, ids: [String]): [NestedCategory]
   categories_tree(lang: String, id: String): Tree
   result(filterBy: filterByType, date_from: String, date_to: String, ids: [String]): [ResultItem]
   resultEvent(id: String): ResultItem
   eventSchedule(id: String, date_from: String, date_to: String): EventSchedule
   searchCategories(lang: String, label: String): [CategoriesSearchResultListItem]
  }

  schema {
   query: Query
  }
`;

module.exports = typeDefs;
