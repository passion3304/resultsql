const mergeCategoryTrees = require('../util/mergeCategoryTrees');
const SportCategoriesController = require('./SportCategoriesController');
const ResultController = require('./ResultController');
const TimingController = require('./TimingController');
const { prepareChildren } = require('../util/helpers');

class MergedCategoriesController {
  // TODO implement cache here
  getCategories({ lang, filter }) {
    const sortingOrder = SportCategoriesController.getSortingOrder({ lang });
    if (filter.indexOf('ago') !== -1) {
      const categories = prepareChildren(ResultController.getTree({
        lang,
        filter,
      })).sort((a, b) => sortingOrder.indexOf(+a.id) - sortingOrder.indexOf(+b.id));
      return {
        categories,
      };
    }
    if (filter.indexOf('forward') !== -1) {
      return {
        categories: prepareChildren(SportCategoriesController.getTree({ lang, filter })),
      };
    }
    const categories = prepareChildren(mergeCategoryTrees({
      liveTree: SportCategoriesController.getTree({ lang, filter: 'today' }),
      resultTree: ResultController.getTree({ lang, filter: 'today' }),
    }))
      .sort((a, b) => sortingOrder.indexOf(+a.id) - sortingOrder.indexOf(+b.id));

    return {
      categories,
    };
  }
  // eslint-disable-next-line
  getSchedule({ id, date_from = 'today', date_to = 'today' }) {
    let ids = id;
    if (ids && ids.indexOf(',') !== -1) {
      ids = ids.split(',');
    } else if (ids) {
      ids = [ids];
    }
    const dates = TimingController.generateScheduleRange(date_from, date_to);
    const future = SportCategoriesController.getCategoryByIds({ ids }) || [];
    const results = ResultController.getCategoryByIds({ ids }) || [];
    return {
      dates: dates.map((date) => Object.assign(date, {
        count: future.concat(results).reduce((acc, e) => acc + parseFloat(e[`count_${date.date_label}`] || 0), 0),
      })),
    };
  }
}

module.exports = new MergedCategoriesController();
