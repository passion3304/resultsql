const _ = require('lodash');
const config = require('../../serverconfig');
const FetchController = require('./FetchController');
const TimingController = require('./TimingController');
const { prepareChildren } = require('../util/helpers');
const defaultCategoryIterator = require('../util/defaultCategoryIterator');

const { apiUrl } = config;
const { hasCategoriesCache } = config;
const eventServiceDump = config.eventDumpUrl;
const { languages, ignoredCats } = config;

class SportCategoriesController extends FetchController {
  constructor() {
    const request = languages.map((lang) => ({
      // key: `active_categories_${lang}`,
      key: `categories_data_${lang}`,
      // url: `${apiUrl}/ajax/${lang}/active_categories.json.html`,
      url: `${eventServiceDump.replace('{{LANG}}', 'de')}/v3/categories`,
    })).concat([{
      key: 'event_dump_de',
      url: `${eventServiceDump.replace('{{LANG}}', 'de')}/dump`,
    }]);

    super({
      type: 'categories',
      cacheLifetime: 1000 * 60 * 15, // 15mins
      url: request,
      // url: `https://eventservice.spbk.bet/de/v3/categories`
    });
  }

  /**
   * getCategories
   * getCategories, returns categories with children
   * @param {String} lang
   * @param {String} filter
   * @returns {{categories: Object}}
   */
  getCategories({ lang = 'de', filter }) {
    let categories = this.cache[lang];
    if (filter && filter !== 'all') {
      categories = { categories: this.getFilteredCategories(filter, this.cache[lang].categories) };
    }

    if (hasCategoriesCache && (!filter || (filter && filter === 'all'))) {
      _.set(categories, 'not_filtered', true);
    }
    if(categories !== undefined && categories.categories !== undefined)
      categories.categories = categories.categories.filter((cat) => !ignoredCats[cat.id] || !ignoredCats[cat.cid]);
    
    // console.log("categori", categories)
    return categories;
  }

  /**
   * getFilteredCategories
   * getFilteredCategories, performs filter operation based on filter parameter
   * which can be on of defined in timing controller ranges
   * @param filterCount
   * @param children
   * @returns {Object}
   */
  getFilteredCategories(filterCount, children) {
    return _.reduce(children, (sum, child) => {
      if (parseFloat(child[`count_${filterCount}`]) > 0 && child.children && child.children.length) {
        sum.push({ ...child, children: this.getFilteredCategories(filterCount, child.children) });
      } else if (parseFloat(child[`count_${filterCount}`]) > 0) {
        sum.push(child);
      }
      return sum;
    }, []);
  }

  /**
   * processCache
   * processCache, process cache object after all promises are resolved
   * form end in memory cache
   * @param {Object} cache
   * @returns {Object}
   */
  processCache(cache) {
    return super.processCache(_.reduce(languages, (sum, lang) => {
      const categoriesDump = _.get(cache, `active_categories_${lang}.active_categories`, []);
      const indexes = _.reduce(categoriesDump, (acc, category, index) => {
        acc[category.id] = index;
        return acc;
      }, {});
      const events = _.get(cache, 'event_dump_de.events', []);
      return Object.assign(sum, {
        [lang]: {
          categories: _.sortBy(
            Object.values(prepareChildren(this.formCategoryChildTree(_.cloneDeep(categoriesDump), _.cloneDeep(events)))),
            (category) => indexes[category.id],
          ),
        },
      });
    }, {}));
  }

  /**
   * formCategoryChildTree
   * formCategoryChildTree, merge categories inside parents,
   * forms children arrays for parent categories
   * populate children arrays, remove not all categories aside from roots
   * calculate ranges for all parent categories based on leafs sum
   * @param {Object} categories
   * @param {Object} events
   * @returns {Object}
   */
  formCategoryChildTree(categories, events) {
    const maxCat = _.maxBy(categories, (category) => parseFloat(category.level)) || {};
    const maxLvl = parseFloat(maxCat.level);
    const extended = this.processEventList(categories, events);
    for (let i = maxLvl; i > 0; i--) {
      _.each(categories, (category) => {
        const parent = extended[category.parent_id];
        if (category && category.level === String(i) && parent) {
          const children = parent.children ? parent.children : [];
          const ranges = _.pick(extended[category.id], Object.keys(TimingController.getRanges(TimingController.ranges)));
          children.push(this.formCategoryPath(extended, extended[category.id]));
          Object.assign(
            extended,
            { [parent.id]: Object.assign(TimingController.sumTimeRanges(ranges, parent), { children }) },
          );
          delete extended[category.id];
        }
      });
    }
    return extended;
  }

  /**
   * formCategoryPath
   * formCategoryPath, forms pathes for categories recursively
   * e.g. Football / 1. Bundesliga
   * @param extended
   * @param category
   * @returns {*}
   */
  formCategoryPath(extended, category) {
    let parent = extended[category.parent_id];
    while (parent) {
      Object.assign(extended[category.id], { path: `${parent.path} / ${category.path}` });
      parent = extended[parent.parent_id];
    }
    return category;
  }

  * getCategoryIterator(data, language) {
    const categories = _.get(data, `${language}.categories`, []);

    yield* defaultCategoryIterator(categories);
  }

  /**
   * processEventList
   * processEventList, process all events inside event list fetched from dump,
   * for now we're using event dump with only one language
   * since we're assuming that they are same
   * sums ranges for all leafs categories
   * @param {Object} categories
   * @param {Object} events
   * @returns {Object}
   */
  processEventList(categories, events) {
    const flatten = this.flattenCategories(categories);
    _.each(events, (event) => {
      const category = flatten[event.category_id];
      if (event.category_id && category) {
        const ranges = TimingController.processEvent(event);
        Object.assign(flatten, { [event.category_id]: TimingController.sumTimeRanges(ranges, category) });
      }
    });
    return flatten;
  }

  /**
   * flattenCategories
   * flattenCategories,
   * forms object with categories IDs as a keys from categories array
   * which is received from dump API
   * @param {Array}categories
   * @returns {Object}
   */
  flattenCategories(categories) {
    return _.reduce(categories, (
      sum,
      category,
    ) => Object.assign(
      sum,
      { [category.id]: Object.assign(category, { cid: category.id, path: category.label, detail: category.label }) },
    ), {});
  }
}

module.exports = new SportCategoriesController();
