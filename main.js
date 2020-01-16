const FETCH_URL = 'https://api.trustcruit.com/shinyform/api/answers/stats_global/?question=405';
const FETCH_OPTIONS = {
  method: 'GET',
  mode : 'no-cors',
  headers: {
    'Access-Control-Allow-Origin': '*'
    // 'Content-Type': 'application/json'
  },
};

const app = new Vue({
  el: '#responseList',
  data: {
    reqs: [],
    startTime: Date.now(),
    fetchThisMany: 100,
    isFetching: false,
  },
  mounted() {
    this.init();
  },
  methods: {
    abortRequests() {
      this.fetchThisMany = 0;
    },
    async fetchOne() {
      return fetch(FETCH_URL, FETCH_OPTIONS)
      .then(response => {
        console.log(response);
        let cors = response.type === 'opaque' ? ' | has CORS issues' : '';
        return `time: ${(Date.now() - this.startTime) / 1000}s | status: ${response.status}${cors}`
        // return response.text()
      })
      // .then((data) => {
      //   if(data) {
      //     console.log(JSON.parse(data));
      //     return dat
      //     // this.reqs.push(data);
      //   }
      //   console.log({'empty response probably cuz of CORS?':true})
      //   return 'empty response probably cuz of CORS';
      // })
      .catch((error) => {
        console.error('Error:', error);
      });
    },
    init() {
      this.reqs.push('Initial test, not a real request made here');
      this.isFetching = true;
      (async () => {
        for (let i = 0; i < this.fetchThisMany; i++) {
          console.log('going to fetch next. Currently on: ', i);
          this.reqs.push(await this.fetchOne());
        }
      })();
      this.isFetching = false;
    }
  },
});