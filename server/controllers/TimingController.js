const _ = require('lodash');
const subDays = require('date-fns/sub_days');
const addDays = require('date-fns/add_days');
const endOfDay = require('date-fns/end_of_day');
const startOfDay = require('date-fns/start_of_day');
const getTime = require('date-fns/get_time');
const addHours = require('date-fns/add_hours');
const format = require('date-fns/format');

class TimingController {
  constructor() {
    _.bindAll(this, 'processEvent', 'getRanges', 'generateRanges', 'processEndedEvents', 'generateScheduleRange');
    this.generateRanges();
    setInterval(this.generateRanges, 1000 * 60 * 1);
  }

  /**
   * generateRanges
   * generateRanges, generate ranges for calculating event
   */
  generateRanges() {
    const currentTime = new Date().getTime();
    const localOffset = (new Date().getTimezoneOffset() + 60) * 60000; // setting Berlin timezone

    this.ranges = {
      count_3h: getTime(addHours(new Date(currentTime), 3)) + localOffset,
      count_24h: getTime(addHours(new Date(currentTime), 24)) + localOffset,
      count_today: getTime(endOfDay(new Date(currentTime))) + localOffset,
      count_3d: getTime(addDays(endOfDay(new Date(currentTime)), 3)) + localOffset,
      count_1w: getTime(addDays(endOfDay(new Date(currentTime)), 7)) + localOffset,
      count_live: getTime(addHours(new Date(currentTime), 24)) + localOffset,
      count_live_now: getTime(addHours(new Date(currentTime), 2)) + localOffset,
      count_today_coming_live: getTime(endOfDay(new Date(currentTime))) + localOffset,
      count_1_days_forward_live: [
        getTime(addDays(startOfDay(new Date(currentTime)), 1)) + localOffset,
        getTime(addDays(endOfDay(new Date(currentTime)), 1)) + localOffset,
      ],
      count_1_days_forward: [
        getTime(addDays(startOfDay(new Date(currentTime)), 1)) + localOffset,
        getTime(addDays(endOfDay(new Date(currentTime)), 1)) + localOffset,
      ],
      count_2_days_forward_live: [
        getTime(addDays(startOfDay(new Date(currentTime)), 2)) + localOffset,
        getTime(addDays(endOfDay(new Date(currentTime)), 2)) + localOffset,
      ],
      count_2_days_forward: [
        getTime(addDays(startOfDay(new Date(currentTime)), 2)) + localOffset,
        getTime(addDays(endOfDay(new Date(currentTime)), 2)) + localOffset,
      ],
      count_3_days_forward_live: [
        getTime(addDays(startOfDay(new Date(currentTime)), 3)) + localOffset,
        getTime(addDays(endOfDay(new Date(currentTime)), 3)) + localOffset,
      ],
      count_3_days_forward: [
        getTime(addDays(startOfDay(new Date(currentTime)), 3)) + localOffset,
        getTime(addDays(endOfDay(new Date(currentTime)), 3)) + localOffset,
      ],
      count_4_days_forward_live: [
        getTime(addDays(startOfDay(new Date(currentTime)), 4)) + localOffset,
        getTime(addDays(endOfDay(new Date(currentTime)), 4)) + localOffset,
      ],
      count_4_days_forward: [
        getTime(addDays(startOfDay(new Date(currentTime)), 4)) + localOffset,
        getTime(addDays(endOfDay(new Date(currentTime)), 4)) + localOffset,
      ],
      count_5_days_forward_live: [
        getTime(addDays(startOfDay(new Date(currentTime)), 5)) + localOffset,
        getTime(addDays(endOfDay(new Date(currentTime)), 5)) + localOffset,
      ],
      count_5_days_forward: [
        getTime(addDays(startOfDay(new Date(currentTime)), 5)) + localOffset,
        getTime(addDays(endOfDay(new Date(currentTime)), 5)) + localOffset,
      ],
      count_6_days_forward_live: [
        getTime(addDays(startOfDay(new Date(currentTime)), 6)) + localOffset,
        getTime(addDays(endOfDay(new Date(currentTime)), 6)) + localOffset,
      ],
      count_6_days_forward: [
        getTime(addDays(startOfDay(new Date(currentTime)), 6)) + localOffset,
        getTime(addDays(endOfDay(new Date(currentTime)), 6)) + localOffset,
      ],
      count_7_days_forward_live: [
        getTime(addDays(startOfDay(new Date(currentTime)), 7)) + localOffset,
        getTime(addDays(endOfDay(new Date(currentTime)), 7)) + localOffset,
      ],
      count_7_days_forward: [
        getTime(addDays(startOfDay(new Date(currentTime)), 7)) + localOffset,
        getTime(addDays(endOfDay(new Date(currentTime)), 7)) + localOffset,
      ],
    };

    this.endedRanges = {
      count_7_days_ago: [
        getTime(subDays(startOfDay(new Date(currentTime)), 7)) + localOffset,
        getTime(subDays(endOfDay(new Date(currentTime)), 7)) + localOffset,
      ],
      count_6_days_ago: [
        getTime(subDays(startOfDay(new Date(currentTime)), 6)) + localOffset,
        getTime(subDays(endOfDay(new Date(currentTime)), 6)) + localOffset,
      ],
      count_5_days_ago: [
        getTime(subDays(startOfDay(new Date(currentTime)), 5)) + localOffset,
        getTime(subDays(endOfDay(new Date(currentTime)), 5)) + localOffset,
      ],
      count_4_days_ago: [
        getTime(subDays(startOfDay(new Date(currentTime)), 4)) + localOffset,
        getTime(subDays(endOfDay(new Date(currentTime)), 4)) + localOffset,
      ],
      count_3_days_ago: [
        getTime(subDays(startOfDay(new Date(currentTime)), 3)) + localOffset,
        getTime(subDays(endOfDay(new Date(currentTime)), 3)) + localOffset,
      ],
      count_2_days_ago: [
        getTime(subDays(startOfDay(new Date(currentTime)), 2)) + localOffset,
        getTime(subDays(endOfDay(new Date(currentTime)), 2)) + localOffset,
      ],
      count_1_days_ago: [
        getTime(subDays(startOfDay(new Date(currentTime)), 1)) + localOffset,
        getTime(subDays(endOfDay(new Date(currentTime)), 1)) + localOffset,
      ],
      count_today: [
        getTime(startOfDay(new Date(currentTime))) + localOffset,
        getTime(new Date(currentTime)) + localOffset,
      ],
    };
  }

  /**
   * processEvent
   * processEvent, check if event is included in any predefined time ranges
   * add count : 1 by default after each event in category
   * unix time stamp is shipped from a server converted to ms
   * @param {Object} event
   * @returns {*}
   */
  processEvent(event) {
    return _.reduce(this.ranges, (sum, range, key) => {
      if ((!Array.isArray(range) && range > parseFloat(event.expires_ts) * 1000)
        || (Array.isArray(range) && range[0] <= parseFloat(event.expires_ts) * 1000 && range[1] > parseFloat(event.expires_ts) * 1000)
      ) {
        if (key === 'count_live_now' && event.live_status !== 'disabled' && event.live_status !== 'suspended' && event.live_status !== 'future') {
          return Object.assign(sum, { [key]: 1 });
        }
        if (key === 'count_live' && event.live_status !== 'disabled') {
          return Object.assign(sum, { [key]: 1 });
        }
        if (key.indexOf('_live') === -1) {
          return Object.assign(sum, { [key]: 1 });
        }
        if (key.indexOf('_live') !== -1 && event.live_status !== 'future' && event.live_status !== 'disabled') {
          return Object.assign(sum, { [key]: 1 });
        }
        return sum;
      }

      return sum;
    }, this.getRanges(this.ranges));
  }

  /**
   * processEndedEvents
   * form ranges for ended events
   * @param events
   */
  processEndedEvents(event) {
    return _.reduce(this.endedRanges, (sum, range, key) => {
      if (range[0] <= parseFloat(event.expires_ts) * 1000 && range[1] > parseFloat(event.expires_ts) * 1000) {
        return Object.assign(sum, { [key]: 1 });
      }
      return sum;
    }, this.getRanges(this.endedRanges));
  }

  /**
   * sumTimeRanges
   * sumTimeRanges, dynamiclly sums up ranges
   * e.g. {count: 1} + { count: 2} = { count: 3 }
   * @param {Object} ranges
   * @param {Object} category
   * @returns {*}
   */
  sumTimeRanges(ranges, category) {
    return _.reduce(ranges, (sum, range, key) => {
      if (range && sum[key]) {
        return Object.assign(sum, { [key]: sum[key] + range });
      }
      if (range && !sum[key]) {
        return Object.assign(sum, { [key]: range });
      }
      return sum;
    }, category);
  }

  /**
   * getRanges
   * getRanges, create empty range object, count is 1 by default
   * @returns {*}
   */
  getRanges(ranges) {
    return Object.keys(ranges).reduce((sum, range) => Object.assign(sum, { [range]: 0 }), { count: 1 });
  }

  generateScheduleRange(from, to) {
    const ranges = [
      '7_days_ago',
      '6_days_ago',
      '5_days_ago',
      '4_days_ago',
      '3_days_ago',
      '2_days_ago',
      '1_days_ago',
      'today',
      '1_days_forward',
      '2_days_forward',
      '3_days_forward',
      '4_days_forward',
      '5_days_forward',
      '6_days_forward',
      '7_days_forward',
    ];

    const fromIndex = ranges.indexOf(from);
    const toIndex = ranges.indexOf(to);
    if (fromIndex > toIndex || fromIndex === -1 || toIndex === -1) {
      return [];
    }

    return ranges.splice(fromIndex, (toIndex - fromIndex) + 1).reduce((acc, e) => {
      if (e === 'today') {
        return acc.concat({
          date_label: e,
          date: format(this.ranges.count_today, 'DD.MM.YYYY'),
          start: this.ranges.count_today,
          end: this.ranges.count_today_coming_live,
        });
      }
      return acc.concat({
        date_label: e,
        date: format((this.ranges[`count_${e}`] || this.endedRanges[`count_${e}`])[1], 'DD.MM.YYYY'),
        start: (this.ranges[`count_${e}`] || this.endedRanges[`count_${e}`])[0],
        end: (this.ranges[`count_${e}`] || this.endedRanges[`count_${e}`])[1],
      });
    }, []);
  }
}

module.exports = new TimingController();
