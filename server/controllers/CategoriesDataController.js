const _ = require('lodash');
const config = require('../../serverconfig');
const FetchController = require('./FetchController');

const apiUrl = config.categoryDataUrl;
const { languages } = config;

class CategoriesDataController extends FetchController {
  constructor(domain, language) {
    const request = languages.map((lang) => {
      const query = JSON.stringify({
        domain,
        lang,
        type: 'combined_events',
      });

      const url = new URL(apiUrl);
      url.pathname = 'dump';
      url.searchParams.set('requestData', query);

      return {
        key: `categories_data_${lang}`,
        url: url.toString(),
      };
    });

    super({
      type: 'categoriesData',
      cacheLifetime: 1000 * 60 * 15, // 15mins
      url: request,
      shouldStore: false,
    });

    this.domain = domain;
    this.defaultLanguage = language;

    _.bindAll(this, ['getCategoriesWeight', 'getCategoriesWeightForType', 'withWeightData']);
  }

  processCache(response) {
    return _.reduce(languages, (result, lang) => {
      result[lang] = _.get(response, [`categories_data_${lang}`, lang, this.domain], []);

      return result;
    }, {});
  }

  getCategoriesWeight() {
    const data = _.get(this.cache, [this.defaultLanguage, 'combined_events', 'home', 'categoryweight'], {});

    return _.reduce(data, (result, values, type) => {
      result[type] = _.reduce(values, (acc, catWeight, catId) => {
        acc.push({
          categoryId: _.parseInt(catId),
          weight: catWeight,
        });
        return acc;
      }, []);

      return result;
    }, {});
  }

  getCategoriesWeightForType(type) {
    return _.get(this.getCategoriesWeight(), [type], {});
  }

  /**
   * isLongtermCategory
   * isLongtermCategory, check is longterm category or not
   * form end in memory cache
   * @param {Object} category
   * @returns {Boolean}
   */
  isLongtermCategory(category) {
    return _.includes(category.path, 'Langzeitwetten') || _.includes(category.path, 'Outrights');
  }

  /**
   * setRegularLongtermCategoryFlags
   * setRegularLongtermCategoryFlags, set flags in response for categories(top level) which have regular and longterm subcategories
   * form end in memory cache
   * @param {Object} resonse
   * @param {Object} categoriesMap
   * @returns {Object}
   */
  setRegularLongtermCategoryFlags(response, categoriesMap) {
    return _.map(response[this.defaultLanguage].categories, (category) => {
      _.set(category, 'is_only_longterm', _.get(categoriesMap, `long_${category.id}`));
      _.set(category, 'is_only_regular', _.get(categoriesMap, `regular_${category.id}`));
    });
  }

  // decorating
  withWeightData(controller, response) {
    if (typeof controller.getCategoryIterator !== 'function') {
      return response;
    }

    const categoryIterator = controller.getCategoryIterator(response, this.defaultLanguage);

    const sportData = this.getCategoriesWeightForType('sports');
    const longtermData = this.getCategoriesWeightForType('longterm');

    const categoriesMap = {};

    /* eslint-disable-next-line */
    for (const category of categoryIterator) {
      const sportWeightRecord = _.find(sportData, ({ categoryId }) => categoryId === _.parseInt(category.id));
      const ltWeightRecord = _.find(longtermData, ({ categoryId }) => categoryId === _.parseInt(category.id));
      // set top level categories as longterm and regular by default
      if (!category.top_category_id) {
        categoriesMap[`long_${category.id}`] = true;
        categoriesMap[`regular_${category.id}`] = true;
      }

      if (category.top_category_id) {
        if (!this.isLongtermCategory(category)) {
          categoriesMap[`long_${category.top_category_id}`] = false;
        } else {
          categoriesMap[`regular_${category.top_category_id}`] = false;
        }
      }

      category.is_highlights = !!sportWeightRecord;
      category.is_longterm_highlights = !!ltWeightRecord;
      category.weight = (sportWeightRecord || ltWeightRecord || {}).weight || null;
    }

    this.setRegularLongtermCategoryFlags(response, categoriesMap);

    return response;
  }
}
module.exports = (new CategoriesDataController('tb.exxs.net', 'de'));
