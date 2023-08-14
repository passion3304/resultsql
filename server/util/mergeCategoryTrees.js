const _ = require('lodash');

function mergeItems(firstValue, secondValue, key) {
  if (key.search('count') !== -1) {
    return (+firstValue) + (+secondValue);
  }

  return firstValue || secondValue;
}

function mergeCategoryTrees({ liveTree, resultTree }) {
  const difference = _.differenceBy(resultTree, liveTree, (el) => parseFloat(el.id));
  const intersections = _.intersectionBy(resultTree, liveTree, (el) => parseFloat(el.id));
  return _.reduce(liveTree.concat(difference), (sum, firstLvlItem) => {
    const clonedFirstLvlItem = { count_today: 0, ..._.cloneDeep(firstLvlItem) };
    const cloneNeighbour = intersections.find((element) => parseFloat(element.id) === parseFloat(clonedFirstLvlItem.id));
    if (cloneNeighbour) {
      if (_.isArray(cloneNeighbour.children) && cloneNeighbour.children.length) {
        const cloneNeighbourChildren = cloneNeighbour.children;
        delete cloneNeighbour.children;
        const firstLvlItemChildren = _.cloneDeep(clonedFirstLvlItem.children);
        delete clonedFirstLvlItem.children;

        const mergedChildren = mergeCategoryTrees({
          liveTree: firstLvlItemChildren || [],
          resultTree: cloneNeighbourChildren || [],
        });
        const mergedItem = _.mergeWith(clonedFirstLvlItem, cloneNeighbour, mergeItems);
        sum.push({ ...mergedItem, children: mergedChildren });
      } else {
        const firstLvlItemChildren = _.cloneDeep(clonedFirstLvlItem.children);
        delete clonedFirstLvlItem.children;
        const mergedItem = _.mergeWith(clonedFirstLvlItem, cloneNeighbour, mergeItems);
        sum.push({ ...mergedItem, children: firstLvlItemChildren });
      }
    } else {
      sum.push(clonedFirstLvlItem);
    }
    return sum;
  }, []);
}

module.exports = mergeCategoryTrees;
