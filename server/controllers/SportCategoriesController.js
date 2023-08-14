const _ = require('lodash');
const config = require('../../serverconfig');
const FetchController = require('./FetchController');
const TimingController = require('./TimingController');
const { mergeAsTopCategory, isLongTime } = require('../util/helpers');
const defaultCategoryIterator = require('../util/defaultCategoryIterator');

const { apiUrl } = config;
const eventServiceDump = config.eventDumpUrl;
const { languages, ignoredCats } = config;

class SportCategoriesController extends FetchController {
  constructor() {
    const request = languages.map((lang) => ({
      key: `active_categories_${lang}`,
      url: `${apiUrl}/ajax/${lang}/get_all_categories.json.html`,
      //  url: `${apiUrl}/ajax/${lang}/active_categories.json.html`,
      // url: `${eventServiceDump.replace('{{LANG}}', 'de')}/v3/categories`,
    })).concat([{
      key: 'event_dump_de',
      url: `${eventServiceDump.replace('{{LANG}}', 'de')}/dump`,
    }]);

    super({
      type: 'sportCategories',
      cacheLifetime: 1000 * 60 * 15, // 15mins
      url: request,
    });
    _.bindAll(this, 'formTree', 'getTree', 'processFinishedEvents', 'processLiveCounters', 'getSortingOrder');
  }

  /**
   * getCategoryById
   * getCategoryById, returns flattened category by id
   * Category doesn't have any children here
   * @param {String} lang
   * @param {String} id
   * @returns {*}
   */
  getCategoryById({ lang = 'de', id }) {
    return this.cache[lang].flattenCategories[id];
  }

  getCategoryByIds({ lang = 'de', ids }) {
    if (this.cache && this.cache[lang] && this.cache[lang].flattenCategories) {
      const { flattenCategories } = this.cache[lang];

      return ids.reduce((result, id) => {
        const item = flattenCategories[id];
        if (item) {
          result.push(item);
        }
        return result;
      }, []).filter((item) => typeof item === 'object');
    }

    return [];
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
   * form a tree with categories
   * @param filter
   * @returns {{categories}}
   */
  getTree({ filter }) {
    return this.getFilteredCategories(filter, this.cache.de.tree);
  }

  /**
   * getCategoriesTree
   * getCategoriesTree, form categories tree with limited children
   * used on mobile client
   * @param {String} lang
   * @param {String} id
   * @returns {*}
   */
  getCategoriesTree({ lang = 'de', id }) {
    return this.searchTreeNode(this.cache[lang].categories, id);
  }

  /**
   * get sorted array of ids of all categories with level:1
   * @param lang
   * @returns {*}
   */
  getSortingOrder({ lang = 'de' }) {
    return this.cache[lang].sortingOrder;
  }

  /**
   * searchTreeNode
   * searchTreeNode, recursively search children with id
   * @param {Object} children
   * @param {String} id
   * @returns {*}
   */
  searchTreeNode(children, id) {
    let found = null;
    let nextChildren = [];
    if (id === 'undefined' || !id) {
      return this.formNodeTree({
        children,
      });
    }
    _.each(children, (child) => {
      if (child.id === id) {
        found = child;
        return false;
      }
      if (child.children) {
        nextChildren = nextChildren.concat(child.children);
      }
      return true;
    });
    if (!found && nextChildren.length) {
      return this.searchTreeNode(nextChildren, id);
    }
    return this.formNodeTree(found);
  }

  /**
   * formNodeTree
   * formNodeTree, convert category to tree node format
   * @param {Object} category
   * @returns {*}
   */
  formNodeTree(category) {
    if (!category) return {};
    return {
      ...category,
      parent_name: category.label,
      parent_id: category.id,
      counttoday: category.count_today,
      countall: category.count,
      count: String(category.children ? category.children.length : 0),
      count24h: category.count_24h,
      items: _.reduce(category.children, (items, child) => {
        const item = Object.assign(child, {
          maincat: category.id,
          count_subcat: String(child.children ? child.children.length : 0),
          count_events: child.count,
        });
        items.push(item);
        return items;
      }, []),
    };
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
      const categoriesDump = _.get(cache, `active_categories_${lang}.categories`, []).filter((e) => parseFloat(e.activated_id));
      const sortingOrder = _.get(cache, `active_categories_${lang}.categories`, []).filter((el) => el.level < 2).map((el) => +el.id);
      // const categoriesDump = _.get(cache, `${eventServiceDump.replace('{{LANG}}', 'de')}/v3/categories`, []).filter((e) => parseFloat(e.activated_id));
      // const sortingOrder = _.get(cache, `${eventServiceDump.replace('{{LANG}}', 'de')}/v3/categories`, []).filter((el) => el.level < 2).map((el) => +el.id);

      const events = _.reduce(_.get(cache, 'event_dump_de.events', {}), (acc, el, key) => {
        if (isLongTime(el)) {
          return acc;
        }
        return Object.assign(acc, { [key]: el });
      }, {});
      return Object.assign(sum, {
        [lang]: {
          flattenCategories: this.flattenChild(this.formCategoryChildTree(_.cloneDeep(categoriesDump), _.cloneDeep(events))),
          tree: this.formTree(this.formCategoryChildTree(_.cloneDeep(categoriesDump), _.cloneDeep(events))),
          sortingOrder,
        },
      });
    }, {}));
  }

  * getCategoryIterator(data, language) {
    const categories = _.concat(
      Object.values(_.get(data, `${language}.flattenCategories`, {})),
      Object.values(_.get(data, `${language}.tree`, {})),
    );

    yield* defaultCategoryIterator(categories);
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

  processChildren(parent, children) {
    _.get(parent, 'children', []).forEach((el) => {
      if (el.children && !mergeAsTopCategory(el.cid)) {
        return this.processChildren(el, children);
      }
      if (mergeAsTopCategory(el.cid)) {
        Object.assign(el, { mergedTree: (el.children || []).map((e) => e.id) || [] });
      }
      delete el.children;
      return children.push(Object.assign(el, { path: el.path.split('/').splice(1, el.path.split('/').length - 2).join('/') }));
    });
    return children;
  }

  /**
   * formTree
   * formTree, merge categories inside parents,
   * forms children arrays for parent categories
   * populate children arrays, remove not all categories aside from roots
   * calculate ranges for all parent categories based on leafs sum
   * @param {Object} categories
   * @returns {Object}
   */
  formTree(categories) {
    return _.reduce(_.pickBy(
      categories,
      (el) => parseFloat(el.level) === 1,
    ), (acc, el) => Object.assign(acc, { [el.id]: Object.assign(el, { children: this.processChildren(el, []) }) }), {});
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
    return _.reduce(categories, (sum, category) => Object.assign(sum, {
      [category.id]: Object.assign(category, {
        cid: category.id,
        path: category.label,
        detail: category.label,
      }),
    }), {});
  }

  /**
   * flattenChild
   * flattenChild, create map from parent categories recursively
   * adding leaf categories as a value with key as id
   * @param {Object} cache
   * @param {Object} newCache
   * @param {Number} topId
   * @returns {Object}
   */
  flattenChild(cache, newCache = {}, topId = null) {
    return _.reduce(cache, (sum, category) => {
      const topCategoryId = (category.level === '1') ? category.id : topId;

      if (category.children && category.children.length) {
        Object.assign(sum, {
          [category.id]: Object.assign(
            _.omit(category, ['children']),
            { count_subcat: String(category.children ? category.children.length : 0) },
            { top_category_id: topCategoryId },
          ),
        });
        return this.flattenChild(category.children, sum, topCategoryId);
      }

      const preparedObject = {
        [category.id]: category,
      };

      _.set(preparedObject[category.id], 'top_category_id', topCategoryId);
      Object.assign(sum, preparedObject);
      return sum;
    }, newCache);
  }

  /**
   * executed when event is ended
   * @param update
   */
  processFinishedEvents(update) {
    if (!_.get(this.cache, 'de.tree') || !update || !update.length) {
      return null;
    }
    try {
      const parsed = JSON.parse(update);
      if (!parsed.category_tree || !parsed.category_tree[0] || !this.cache.de.tree[parsed.category_tree[0]]) {
        return null;
      }
      const topKey = parsed.category_tree[0];
      clearTimeout(this.timeout);
      this.timeout = setTimeout(this.fetch, this.cacheLifetime / 3);

      return Object.assign(this.cache.de.tree, {
        [topKey]: Object.assign(this.cache.de.tree[topKey] || {}, {
          count_live_now: _.get(this.cache, `de.tree.${topKey}.count_live_now`) - 1 || 0,
          count_today_coming_live: _.get(this.cache, `de.tree.${topKey}.count_today_coming_live`) - 1 || 0,
          children: _.get(this.cache, `de.tree.${topKey}.children`, []).reduce((acc, child) => {
            if (String(child.id) === String(JSON.parse(update).category_id)) {
              return acc.concat(Object.assign(child, {
                count_live_now: child.count_live_now - 1,
                count_today_coming_live: child.count_today_coming_live - 1,
              }));
            }
            return acc.concat(child);
          }, []),
        }),
      });
    } catch (e) {
      console.log(e);
      return this.cache.de.tree;
    }
  }

  /**
   * executed when match is started
   * @param update
   */
  processLiveCounters(update) {
    if (!_.get(this.cache, 'de.tree') || !update || !update.length) {
      return null;
    }
    try {
      const parsed = JSON.parse(update);
      if (!parsed.category_tree || !parsed.category_tree[0] || !this.cache.de.tree[parsed.category_tree[0]]) {
        return null;
      }
      const topKey = parsed.category_tree[0];
      clearTimeout(this.timeout);
      this.timeout = setTimeout(this.fetch, this.cacheLifetime / 3);

      return Object.assign(this.cache.de.tree, {
        [topKey]: Object.assign(this.cache.de.tree[topKey] || {}, {
          count_live_now: _.get(this.cache, `de.tree.${topKey}.count_live_now`) + 1 || 0,
          children: _.get(this.cache, `de.tree.${topKey}.children`, []).reduce((acc, child) => {
            if (String(child.id) === String(JSON.parse(update).category_id)) {
              return acc.concat(Object.assign(child, { count_live_now: child.count_live_now + 1 }));
            }
            return acc.concat(child);
          }, []),
        }),
      });
    } catch (e) {
      console.log(e);
      return this.cache.de.tree;
    }
  }

  searchCategories({ lang = 'de', label }) {
    const labelInvalid = !label || label.length < 2;
    if (_.isEmpty(this.cache[lang]) || labelInvalid) {
      return [];
    }

    return this.searchCategoriesByLabel({
      categories: this.cache[lang].flattenCategories,
      label,
    });
  }

  searchCategoriesByLabel({ categories, label }) {
    const result = [];

    _.map(categories, (category) => {
      if (ignoredCats[category.id] || ignoredCats[category.cid]) {
        return;
      }

      const regExp = new RegExp(label, 'i');
      if (regExp.test(category.label)) {
        result.push({
          id: category.id,
          label: category.label,
          top_category_id: category.top_category_id,
        });
      }

      if (!category.children || category.children.length === 0) {
        return;
      }

      result.push(...this.searchCategoriesByLabel({
        categories: category.children,
        label,
      }));
    });

    return result;
  }
}

module.exports = new SportCategoriesController();
