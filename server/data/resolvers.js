const logger = require('../util/logger');

function initResolvers() {
  const SportCategoriesController = require('../controllers/SportCategoriesController');
  const CategoriesContainer = require('../controllers/CategoriesContainer');
  const ResultController = require('../controllers/ResultController');
  const MergedCategoriesController = require('../controllers/MergedCategoriesController');
  // depends on CategoriesContainer
  const CategoriesDataController = require('../controllers/CategoriesDataController');
  CategoriesContainer.dataDecorators.push(CategoriesDataController.withWeightData);
  SportCategoriesController.dataDecorators.push(CategoriesDataController.withWeightData);

  return {
    Query: {
      category(root, args) {
        logger.log('info', `${new Date().toString()} - category query info`);
        return SportCategoriesController.getCategoryById(args);
      },
      categories(root, args) {
        logger.log('info', `${new Date().toString()} - categories query info`);

        return CategoriesContainer.getCategories(args);
      },
      mergedCategories(root, args) {
        logger.log('info', `${new Date().toString()} - mergedCategories query info`);

        return MergedCategoriesController.getCategories(args);
      },
      categories_tree(root, args) {
        logger.log('info', `${new Date().toString()} - categories_tree query info`);
        return SportCategoriesController.getCategoriesTree(args);
      },
      categoriesByIds(root, args) {
        logger.log('info', `${new Date().toString()} - categoriesByIds query info`);
        return SportCategoriesController.getCategoryByIds(args);
      },
      result(root, args) {
        logger.log('info', `${new Date().toString()} - result query info`);
        return ResultController.filter(args);
      },
      resultEvent(root, args) {
        logger.log('info', `${new Date().toString()} - result event query info`);
        return ResultController.getEventById(args);
      },
      eventSchedule(root, args) {
        logger.log('info', `${new Date().toString()} - eventSchedule query info`);
        return MergedCategoriesController.getSchedule(args);
      },
      searchCategories(root, args) {
        logger.log('info', `${new Date().toString()} - search_categories query info`);
        return SportCategoriesController.searchCategories(args);
      },
    },
  };
}

module.exports = initResolvers;
