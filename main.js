var app = new Vue({
  el: '#responseList',
  data: {
    mess: 'ZAZ',
    reqs: [],
  },
  mounted() {
    this.init();
  },
  methods: {
    init: function() {
      this.reqs.push('ya');
      this.reqs.push('two');
    },
  },
})