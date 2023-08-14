const _ = require('lodash');

function* defaultCategoryIterator(categories) {
  for (let i = 0; i < categories.length; i++) {
    yield categories[i];

    let childCategories = _.get(categories, [i, 'children'], []);

    if (_.isObject(childCategories)) {
      childCategories = Object.values(childCategories);
    }

    childCategories = childCategories.filter(Boolean);

    for (let j = 0; j < childCategories.length; j++) {
      yield childCategories[j];
    }
  }
}

module.exports = defaultCategoryIterator;
