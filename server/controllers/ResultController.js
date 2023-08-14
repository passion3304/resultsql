const _ = require('lodash');
const moment = require('moment');
const config = require('../../serverconfig');
const FetchController = require('./FetchController');
const TimingController = require('./TimingController');
const { convertEventToResult, mergeAsTopCategory } = require('../util/helpers');
const { putEvent } = require('../util/helpers');

const defaultCategoryIterator = require('../util/defaultCategoryIterator');

const apiUrl = config.resultApiUrl;

const generateKey = (filter) => {
  switch (filter) {
    case 'BETRADAR':
      return 'bid';
    default:
      return 'id';
  }
};

class ResultController extends FetchController {
  constructor() {
    super({
      type: 'result',
      cacheLifetime: 1000 * 60 * 15, // 15mins
      url: apiUrl,
    });
    // eslint-disable-next-line max-len
    _.bindAll(this, 'filter', 'processCache', 'formTree', 'getTree', 'getFilteredCategories', 'processFinishedEvents', 'processLiveCounters', 'getCategoryById', 'getEventById');
  }

  filter(filters) {
    const filterBy = _.get(filters, 'filterBy', 'CATEGORY');
    let ids = _.get(filters, 'ids[0]', null);
    if (ids && ids.indexOf(',') !== -1) {
      ids = ids.split(',');
    } else if (ids) {
      ids = [ids];
    }
    const dateFrom = parseFloat(_.get(filters, 'date_from', null)) * 1000;
    const dateTo = parseFloat(_.get(filters, 'date_to', null)) * 1000;
    const isExistIds = Array.isArray(ids) && ids.length;

    if ((dateFrom && !moment(dateFrom).isValid()) || (dateTo && !moment(dateTo).isValid())) {
      throw new Error('invalid date, should be YYYY-MM-DD');
    }

    const key = generateKey(filterBy);
    return _.filter(this.cache.events, (element) => {
      if (isExistIds) {
        const isExist = ids.some((id) => (
          filterBy === 'CATEGORY' ? _.get(element, 'cats', []).some((cat) => +cat.id === +id) : +id === element[key]
        ));
        if (!isExist) {
          return null;
        }
      }

      if (dateFrom && dateTo) {
        return moment.unix(element.expires_ts).isBefore(moment(dateTo)) && moment.unix(element.expires_ts).isSameOrAfter(moment(dateFrom));
      }

      if (dateFrom) {
        return moment.unix(element.expires_ts).isSameOrAfter(moment(dateFrom));
      }

      if (dateTo) {
        return moment.unix(element.expires_ts).isBefore(moment(dateTo));
      }

      return element;
    });
  }

  getEventById(args) {
    return this.cache.events[args.id];
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
    return this.getFilteredCategories(filter, this.cache.tree);
  }

  getCategoryById({ id }) {
    return this.cache.flattenCategories[id];
  }

  getCategoryByIds({ ids }) {
    if (this.cache && this.cache.flattenCategories) {
      const { flattenCategories } = this.cache;

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

  formItems(item) {
    const values = _.values(item.cats);
    const keys = _.keys(item.cats).map(parseFloat);
    let currentIndex = _.findIndex(values, (el) => parseFloat(el.topcatid) === 0);
    let currentItem = values[currentIndex];
    let i = 0;
    let currentKey = keys[currentIndex];
    const items = [Object.assign(currentItem, { id: currentKey })];

    while (parseFloat(currentKey) !== parseFloat(item.cid) || i < 5) {
      currentIndex = _.findIndex(values, (el) => parseFloat(el.topcatid) === parseFloat(currentKey));// eslint-disable-line
      if (currentIndex !== -1) {
        currentKey = keys[currentIndex];
        currentItem = values[currentIndex];
        items.push(Object.assign(currentItem, { id: currentKey }));
      }
      i++;
    }
    return items;
  }

  processCache(cache) {
    let categories = {};
    const processed = {};
    _.map(cache, (_item) => {
      const item = { ..._item };
      const ranges = TimingController.processEndedEvents(item);
      item.cats = this.formItems(item);
      item.category_path = _.reduce(item.cats, (acc, el) => ({
        ...acc,
        en: acc.en ? `${acc.en} / ${_.get(el, 'label.en')}` : `${_.get(el, 'label.en')}`,
        de: acc.de ? `${acc.de} / ${_.get(el, 'label.de')}` : `${_.get(el, 'label.de')}`,
      }), { de: '', en: '' });

      item.cats = _.map(item.cats, (value, index) => {
        if (!categories[value.id]) {
          categories[value.id] = {
            top_category_id: item.cats[0].id,
            level: index + 1,
            label: value.label.de,
            id: value.id,
            parent_id: value.topcatid,
            cid: value.id,
            path: item.category_path.de.split('/').splice(1, index - 1).join('/'),
            detail: value.label.de,
            last: (index === item.cats.length - 1 && !mergeAsTopCategory(value.topcatid)) || mergeAsTopCategory(value.id),
          };
        }
        if (mergeAsTopCategory(value.id)) {
          if (item.cats[index + 1] && item.cats[index + 1].id) {
            Object.assign(categories[value.id], { mergedTree: (categories[value.id].mergedTree || []).concat(item.cats[index + 1].id) });
          }
        }
        categories = { ...categories, [value.id]: TimingController.sumTimeRanges(ranges, categories[value.id]) };
        return value;
      });

      if (_.isObject(item.json) && _.isObject(item.json.data)) {
        item.json.data.periods = _.map(item.json.data.periods, (value, index) => ({ type: index, data: value }));
      }
      processed[item.id] = item;
    });
    const tree = this.formTree(categories);
    return super.processCache({
      events: processed,
      tree,
      flattenCategories: categories,
    });
  }

  * getCategoryIterator(data, language) {
    const categories = _.concat(
      Object.values(_.get(data, `${language}.flattenCategories`, {})),
      Object.values(_.get(data, `${language}.tree`, {})),
    );

    yield* defaultCategoryIterator(categories);
  }

  /**
   * formTree
   * formTree, merge categories inside parents,
   * forms children arrays for TOP PARENT categories
   * populate children arrays, remove not all categories aside from roots
   * calculate ranges for all parent categories based on leafs sum
   * @param {Object} categories
   * @returns {Object}
   */
  formTree(categories) {
    const tree = _.reduce(categories, (acc, el) => {
      const top = parseFloat(el.top_category_id);
      if (top && el.last) {
        const parent = categories[top];
        return Object.assign(acc, { [top]: Object.assign(parent, { children: parent.children ? parent.children.concat(el) : [el] }) });
      }
      return acc;
    }, {});
    return _.pickBy(tree, (el) => parseFloat(el.level) === 1);
  }

  /**
   * executed when event is ended
   * @param update
   */
  processFinishedEvents(update, score) {
    if (!_.get(this.cache, 'tree') || !update.length) {
      return null;
    }

    try {
      const parsed = JSON.parse(update);
      if (!parsed.category_tree || !parsed.category_tree[0] || !this.cache.tree[parsed.category_tree[0]]) {
        return null;
      }
      const topKey = parsed.category_tree[0];
      const result = convertEventToResult(JSON.parse(update), score);
      clearTimeout(this.timeout);
      this.timeout = setTimeout(this.fetch, this.cacheLifetime / 3);
      putEvent(result);
      this.cache.events[result.id] = result;

      return Object.assign(this.cache.tree, {
        [topKey]: Object.assign(this.cache.tree[topKey], {
          count_live_now: _.get(this.cache, `tree.${topKey}.count_live_now`) - 1 || 0,
          count_today: _.get(this.cache, `tree.${topKey}.count_today`) + 1,
          children: _.get(this.cache, `tree.${topKey}.children`, []).reduce((acc, child) => {
            if (String(child.id) === String(JSON.parse(update).category_id)) {
              return acc.concat(Object.assign(child, {
                count_live_now: child.count_live_now - 1 || 0,
                count_today: child.count_today + 1,
              }));
            }
            return acc.concat(child);
          }, []),
        }),
      });
    } catch (e) {
      console.log(e);
      return this.cache.tree;
    }
  }

  /**
   * executed when match is started
   * @param update
   */
  processLiveCounters(update) {
    if (!_.get(this.cache, 'tree') || !update.length) {
      return null;
    }

    try {
      const parsed = JSON.parse(update);
      if (!parsed.category_tree || !parsed.category_tree[0] || !this.cache.tree[parsed.category_tree[0]]) {
        return null;
      }

      const topKey = parsed.category_tree[0];
      clearTimeout(this.timeout);
      this.timeout = setTimeout(this.fetch, this.cacheLifetime / 3);

      return Object.assign(this.cache.tree, {
        [topKey]: Object.assign(this.cache.tree[topKey], {
          count_live_now: _.get(this.cache, `tree.${topKey}.count_live_now`) + 1,
          children: _.get(this.cache, `tree.${topKey}.children`, []).reduce((acc, child) => {
            if (String(child.id) === String(JSON.parse(update).category_id)) {
              return acc.concat(Object.assign(child, { count_live_now: child.count_live_now + 1 }));
            }
            return acc.concat(child);
          }, []),
        }),
      });
    } catch (e) {
      console.log(e);
      return this.cache.tree;
    }
  }
}

module.exports = new ResultController();
