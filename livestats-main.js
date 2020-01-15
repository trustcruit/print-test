(function() {
	Date.prototype.getWeek = function () {
		var onejan = new Date(this.getFullYear(), 0, 1);
		return Math.ceil((((this - onejan) / 86400000) + onejan.getDay() + 1) / 7);
	};
	var helper = {
		ajaxObject: (function(){
				var factories = [
					function () {return new XMLHttpRequest()},
					function () {return new ActiveXObject("Msxml2.XMLHTTP")},
					function () {return new ActiveXObject("Msxml3.XMLHTTP")},
					function () {return new ActiveXObject("Microsoft.XMLHTTP")}
				],
				xmlhttp = false;
				for (var i=0;i<factories.length;i++) {
					try {
						xmlhttp = factories[i]();
					}
					catch (e) {
						continue;
					}
					xmlhttp = factories[i];
					break;
				}

				return xmlhttp;
			})(),
			ajax: function(url, callback, data, async, ctx, args, method) {
				var method = method || 'GET', // Default to 'GET'
				async = async || true, // Default to async mode
				req = this.ajaxObject(),
				ctx = ctx || window;
				if (!req) {
					return;
				}
				req.open(method,url,async);
				if (data) {
					req.setRequestHeader('Content-type','application/x-www-form-urlencoded');
				}
				req.onreadystatechange = function () {
					if (req.readyState != 4) {
						return;
					}
					if (req.status != 200 && req.status != 304) {
						return;
					}
					callback.apply(ctx, [req, args]);
				}
				if (req.readyState == 4) {
					return;
				}
				req.send(data);
			},
			msToTime: function(ms) {
				var millis = parseInt((ms%1000)/100),
				seconds = parseInt((ms/1000)%60),
				minutes = parseInt((ms/(1000*60))%60),
				hours = parseInt((ms/(1000*60*60))%24);

				hours = hours < 10 ? '0' + hours : hours;
				minutes = minutes < 10 ? '0' + minutes : minutes;
				seconds = seconds < 10 ? '0' + seconds : seconds;

				return hours+':'+minutes+':'+seconds;
			}
	};

	var actionLog = {
		BASE_URL: 'https://app.trustcruit.com/actionlog/',
		ACTION_NAMES: {
			NEW_CANDIDATE: 'Candidate created',
			APPLICANT_ANSWER: 'Feedback submitted',
			NEW_REQUEST_IMPORT: 'Candidate import requested',
		},
		LEVEL_NAMES: {
			step1: 'After application',
			step2: 'After interview',
			step5: 'After &rdquo;no thanks&rdquo;',
		},
		WEEKDAYS: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
		QUARTERS: ['Q1', 'Q2', 'Q3', 'Q4'],
		MONTHS: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'Novemver', 'December'],
		LOADER_EL: document.getElementById('actionLoader'),
		LATEST_EL: document.getElementById('latestCreation'),
		SINCE_LATEST_EL: document.getElementById('sinceLatestCreation'),
		RESPONSE_RATE_INTERVAL_EL: document.getElementById('responseRateIntervalSelect'),
		NEXT_PERIOD_EL: document.getElementById('nextPeriod'),
		PREVIOUS_PERIOD_EL: document.getElementById('previousPeriod'),
		LOADER_TIME: 1000,
		SINCE_TRESHOLD: 60000*5,
		startLoading: undefined,
		latest: undefined,
		interval: undefined,
		previousLatest: undefined,
		periods: undefined,
		currentPeriod: 0,
		getNiceName: function(key, map) {
			return map[key] !== undefined ? map[key] : key;
		},
		init: function() {
			this.interval = this.RESPONSE_RATE_INTERVAL_EL.value;
			this.getData();
			this.getLastFifteen();
			this.getResponseRate(this.interval);
			this.bind();
		},
		bind() {
			this.RESPONSE_RATE_INTERVAL_EL.addEventListener('change', (function(that) {
				return function(e) {
					that.loadResponseRate();
					that.currentPeriod = 0;
					that.interval = e.target.value;
					that.getResponseRate(that.interval);
				}
			})(this));
			this.NEXT_PERIOD_EL.addEventListener('click', (function(that) {
				return function(e) {
					e.preventDefault();
					if (that.periods) {
						that.nextPeriod();
					}
				}
			})(this));
			this.PREVIOUS_PERIOD_EL.addEventListener('click', (function(that) {
				return function(e) {
					e.preventDefault();
					if (that.periods) {
						that.previousPeriod();
					}
				}
			})(this));
		},
		updateLoader: function(loading, text) {
			if (this.LOADER_EL === undefined) {
				return false;
			}
			if (loading) {
				if (text) {
					this.LOADER_EL.innerText = text;
				}
				this.LOADER_EL.classList.add('active');
				this.startLoading = Date.now();
			} else {
				var now = Date.now();
				if (now - this.startLoading > this.LOADER_TIME) {
					this.LOADER_EL.classList.remove('active');
				} else {
					window.setTimeout((function(that) {
						return function() {
							that.LOADER_EL.classList.remove('active');
						}
					})(this), this.LOADER_TIME - (now - this.startLoading));
				}
			}
		},
		getData: function() {
			this.updateLoader(true);
			helper.ajax(this.BASE_URL+'api/actionlog/', this.parseData, undefined, true, this);
		},
		getLastFifteen: function() {
			helper.ajax(this.BASE_URL+'api/responses/', function(response) {
				var d = JSON.parse(response.responseText);
				document.getElementById('newForms').innerText = d.forms_submitted_15_min;
				document.getElementById('newApplicants').innerText = d.applicants_created_15_min;
			}, undefined, true, this);
		},
		getResponseRate: function(interval) {
			var url = this.BASE_URL+'api/response_rate/';
			if (interval !== undefined) {
				url += '?interval='+interval;
			}
			helper.ajax(url, this.parseResponseRate, undefined, true, this);
			this.NEXT_PERIOD_EL.disabled = true;
			this.PREVIOUS_PERIOD_EL.disabled = true;
		},
		parseResponseRate: function(response) {
			var result = JSON.parse(response.responseText);
			if (result === undefined) {
				return false;
			}
			this.periods = result;
			this.displayResponseRate(result);
		},
		parseData: function(response) {
			var result = JSON.parse(response.responseText).results;
			if (result === undefined) {
				return false;
			}
			if (result[0].creation_date !== this.latest) {
				for (var i = 0; i < result.length; i++) {
					result[i].date = new Date(result[i].creation_date);
				}
				if (this.latest !== undefined) {
					this.previousLatest = this.latest;
				}
				this.displayActions(result);
				this.latest = result[0].creation_date;
			} else {
				this.updateLoader(false);
			}
			this.displayLatest(result[0].creation_date, this.getNiceName(result[0].action_name, this.ACTION_NAMES));
			window.setTimeout((function(that) {
				return function() {
					that.getData();
					that.getLastFifteen();
                    that.getResponseRate(that.interval);
				}
			})(this), 5000);
		},
		createDateHeader: function(date) {
			var el = document.createElement('li');
			el.classList.add('date-header');
			el.innerHTML = '<span>'+this.WEEKDAYS[date.getDay()]+'</span>';
			return el;
		},
		prettyTime: function(date) {
			return date.getHours()+':'+(date.getMinutes()<10?'0':'')+date.getMinutes()
		},
		prettyDate: function(date) {
			var month = date.getMonth()+1;
			return date.getFullYear()+'-'+(month<10?'0'+month:month)+'-'+(date.getDate()<10?'0'+date.getDate():date.getDate());
		},
		createTimeTag: function(date) {
			var span = document.createElement('span');
			span.classList.add('time-tag');
			span.innerText = this.prettyTime(date);
			return span;
		},
		createDetailsElement: function(details) {
			var span = document.createElement('small');
			for (var prop in details) {
				if (prop === 'level') {
					span.innerHTML = '<br>'+this.getNiceName(details[prop], this.LEVEL_NAMES);
				} else {
					span.innerHTML = '<br>'+prop+': '+details[prop];
				}
			}
			return span;
		},
		createPeriodLabel: function(date, interval) {
			if (interval === 'week') {
				return 'Week '+date.getWeek()+' '+date.getFullYear();
			}
			if (interval === 'month') {
				return this.MONTHS[date.getMonth()]+' '+date.getFullYear() || date.getMonth()+' '+date.getFullYear();
			}
			if (interval === 'quarter') {
				return this.QUARTERS[this.monthToQuarter(date.getMonth()+1)-1]+' '+date.getFullYear();
			}
			if (interval === 'year') {
				return date.getFullYear();
			}
		},
		monthToQuarter: function(month) {
			return Math.ceil(month/3);
		},
		loadResponseRate: function() {
			document.getElementById('periodLabel').innerHTML = 'Loading...';
			document.getElementById('responseRateList').innerHTML = '<li class="col-md-4"></li><li class="col-md-4"></li><li class="col-md-4"></li>';
		},
		displayPeriodTitle: function(date, interval) {
			document.getElementById('periodLabel').innerHTML = this.createPeriodLabel(date, interval);
		},
		displayResponseRate: function(periods) {
			var list = document.getElementById('responseRateList'),
			results = periods[parseInt(this.currentPeriod)].values;
			this.displayPeriodTitle(new Date(periods[parseInt(this.currentPeriod)].period), this.interval);
			list.innerHTML = '';

			for (var i = 0; i < results.length; i++) {
				if (!this.LEVEL_NAMES[results[i].level]) {
					continue;
				}
				var htmlString = '<li class="col-md-4"><small>';
				htmlString += this.getNiceName(results[i].level, this.LEVEL_NAMES);
				htmlString += '</small><p><strong class="big-number">';
				htmlString += (parseInt(results[i].total)/parseInt(results[i].count)*100).toFixed(1)+'%';
				htmlString += '</strong><br>';
				htmlString += results[i].total+'/'+results[i].count;
				htmlString += '</p></li>';
				list.innerHTML += htmlString;
			}
			this.setupPagination();
		},
		previousPeriod() {
			this.selectPeriod(this.currentPeriod+1);
		},
		nextPeriod() {
			this.selectPeriod(this.currentPeriod-1);
		},
		selectPeriod: function(period) {
			if (this.periods[parseInt(period)]) {
				this.currentPeriod = period;
				this.displayResponseRate(this.periods);
			}
		},
		setupPagination() {
			if (this.hasNextPeriod()){
				this.NEXT_PERIOD_EL.disabled = false;
			} else {
				this.NEXT_PERIOD_EL.disabled = true;
			}
			if (this.hasPreviousPeriod()) {
				this.PREVIOUS_PERIOD_EL.disabled = false;
			} else {
				this.PREVIOUS_PERIOD_EL.disabled = true;
			}
		},
		hasNextPeriod: function() {
			return this.periods[this.currentPeriod-1] ? true : false;
		},
		hasPreviousPeriod: function() {
			return this.periods[this.currentPeriod+1] ? true : false;
		},
		displayLatest: function(dateString, actionText) {
			var date = new Date(dateString),
			ms = Math.abs(new Date()-date),
			previousEl = document.getElementById('latestPrevious');
			this.LATEST_EL.innerText = this.WEEKDAYS[date.getDay()]+' '+this.prettyTime(date);
			this.SINCE_LATEST_EL.msCount = ms;
			this.SINCE_LATEST_EL.innerText = helper.msToTime(ms);
			window.clearInterval(this.counterInterval);
			this.counterInterval = window.setInterval((function(that){
				return function() {
					that.SINCE_LATEST_EL.msCount = that.SINCE_LATEST_EL.msCount+1000;
					that.SINCE_LATEST_EL.innerText = helper.msToTime(that.SINCE_LATEST_EL.msCount);
				}
			})(this), 1000);
			if (this.previousLatest !== undefined) {
				previousEl.parentElement.classList.remove('hidden');
				previousEl.innerHTML = helper.msToTime(new Date(this.latest) - new Date(this.previousLatest));
			}
			if (actionText) {
				var prev = this.SINCE_LATEST_EL.previousElementSibling ? this.SINCE_LATEST_EL.previousElementSibling : document.createElement('div');
				prev.innerText = actionText;
				if (!prev.parentNode) {
					this.SINCE_LATEST_EL.parentNode.insertBefore(prev, this.SINCE_LATEST_EL);
				}
			} else {
				if (this.SINCE_LATEST_EL.previousElementSibling) {
					this.SINCE_LATEST_EL.parentNode.removeChild(this.SINCE_LATEST_EL.previousElementSibling);
				}
			}
			if (ms > this.SINCE_TRESHOLD) {
				this.SINCE_LATEST_EL.classList.add('warn');
			} else {
				this.SINCE_LATEST_EL.classList.remove('warn');
			}
		},
		displayActions: function(actions) {
			var template = document.createElement('li'),
			container = document.getElementById('actionList');
			if (container === undefined) {
				return false;
			}
			container.innerHTML = '';
			template.classList.add('msg-item');
			for (var i = actions.length-1; i >= 0; i--) {
				var itemEl = template.cloneNode();
				if (i === actions.length-1 || actions[i].date.getDay() !== actions[i+1].date.getDay()) {
					container.appendChild(this.createDateHeader(actions[i].date));
				}
				if (actions[i].action_name === 'NEW_CANDIDATE') {
					itemEl.classList.add('inbound');
				} else {
					itemEl.classList.add('outbound');
				}
				itemEl.innerHTML = this.getNiceName(actions[i].action_name, this.ACTION_NAMES);
				if (actions[i].details) {
					itemEl.appendChild(this.createDetailsElement(actions[i].details));
				}
				itemEl.appendChild(this.createTimeTag(actions[i].date));
				container.appendChild(itemEl);
			}
			container.parentNode.scrollTop = container.parentNode.scrollHeight;
			this.updateLoader(false);
		},
	};

	actionLog.init();
})();
