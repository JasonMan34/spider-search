const GOOGLE_SEARCH_URL = "https://www.google.com/search?q=%s&pws=0&gl=us&gws_rd=cr";
let crawlIsDone_local;
let actualCrawl;

function crawl() {
	actualCrawl();
}

function resetObject(obj) {
	for (var k in obj) {
		if (obj.hasOwnProperty(k)) {
			delete obj[k];
		}
	}
}

function getSiteURL(url) {
    let hostname = url.split('/');
	return hostname[0] + "//" + hostname[2]
}

function buildPage(html) {
	return new DOMParser().parseFromString(html, "text/html");
}

function getHitsInPage(page, query) {
	let content = page.body.textContent || page.body.innerHTML;
	return content.split(new RegExp(query, "gi")).length - 1;
}

// Get page, return top 5 results relevant to the site
function getResults(page, siteURL) {
	siteURL = siteURL || "";

	var aElements = page.body.getElementsByTagName("a");
	var links = [];

	for (var i = 0; i < aElements.length; i++) {
		let elem = aElements[i];
		if (elem.parentElement.getAttribute("class") == "r") {
			let href = elem.getAttribute("href");
			if (href && href.startsWith(siteURL) && !links.includes(href)) {
				links.push(href);
			}
		}
	}

	return links;
}

let ajaxRequestsCounter;
let ajaxRequestsLength;
let resultsCounter;
let resultsLength;

function insertHits(obj, query) {
	$.ajax({
		url: obj.url,
		success: (response) => {
			let page = buildPage(response);
			obj.hits = getHitsInPage(page, query)
			resultsCounter += 1;

			if ((ajaxRequestsCounter == ajaxRequestsLength) && (resultsCounter == resultsLength)) {
				endCrawl();
			}
		},
		error: (e) => {
			$("#wtfii-button").removeClass("is-loading");
			$("#results").html("Could not perform spider-search");
		},
	});
}

function crawlAjax(searchURL, query, baseURL, output) {
	let google_search_url = GOOGLE_SEARCH_URL.replace("%s", query + " site:" + searchURL);

	ajaxRequestsLength += 1;

	$.ajax({
		url: google_search_url,
		success: (response) => {
			let page = buildPage(response);
			let topResults = getResults(page, searchURL).slice(0, 5);

			ajaxRequestsCounter += 1;

			for (let i = 0; i < topResults.length; i++) {
				let url = topResults[i];
				if (output.find(obj => obj.url == url) == null) {
					resultsLength += 1;

					let len = output.length;
					output[len] = {url: url.toLowerCase(), resultIndex: (i+1), wideSearch: (searchURL != baseURL)};
					insertHits(output[len], query);
				}
			}

			if ((ajaxRequestsCounter == ajaxRequestsLength) && (resultsCounter == resultsLength)) {
				endCrawl();
			}
		},
		error: (e) => {
			$("#wtfii-button").removeClass("is-loading");
			$("#results").html("Google refused your connection or you don't have an internet connection");
		},
	});
}

const google_crawl = (baseURL, query, output) => {
	resetObject(output);

	if (baseURL.charAt(baseURL.length - 1) == "/") {
		baseURL = baseURL.substr(0, baseURL.length - 1);
	}

	let siteURL = getSiteURL(baseURL)

	resultsLength = 0;
	resultsCounter = 0;
	ajaxRequestsLength = 0;
	ajaxRequestsCounter = 0;

	crawlIsDone_local = false;

	if (siteURL != baseURL) {
		crawlAjax(siteURL, query, baseURL, output);
	}

	crawlAjax(baseURL, query, baseURL, output);
}

function endCrawl() {
	crawlIsDone_local = true;
}

function crawlIsDone() {
	return crawlIsDone_local;
}


// Crawl without google
var MAX_TIMEOUT = 2000; // Time in miliseconds to crawl for
var no_google_crawl = {};

no_google_crawl.getSortedInsertIndex = (array, num) => {
	let index = array.length;

	for (let i = 0; i < array.length; i++) {
		if (num > array[i]) {
			index = i;
			break;
		}
	}

	return index;
}

no_google_crawl.crawlAjax = (url, callback) => {
	$.ajax({
		url: url,
		success: (response) => {
			callback(response);
		},
		error: (e) => {
			console.log(e);
			console.log("Tried to get url: " + url);
		},
	});
}

no_google_crawl.getLinksInPage = (page, startURL) => {
	var links = page.getElementsByTagName("a")
	var URLs = [];

	for (var i = 0; i < links.length; i++) {
		let url = links[i].getAttribute("href");
		if (url && !url.startsWith("javascript:")) {
			// Insert "http(s)://..."
			if (!url.startsWith("http")) {
				if (url.charAt(0) == "/") {
					url = no_google_crawl.hostname + url;
				} else {
					url = startURL + (url.startsWith("./") ? url.substr(2) : url);
				}
			}
			
			url = url.split("#")[0];
			
			// Don't include links that locally redirect backwards
			if ((!url.includes("/../")) && (!URLs.includes(url))) {
				URLs.push(url);
			}
		}
	}

	return URLs;
}

no_google_crawl.doCrawl = (urlObj, output) => {
	let url = urlObj.url;
	let depth = urlObj.depth;

	if ((depth == 5) || (performance.now() - no_google_crawl.startTime > MAX_TIMEOUT) ) {
		console.log("Depth: " + depth);
		endCrawl();
		return;
	}
	
	no_google_crawl.crawlAjax(url, (rawHTML) => {
		// Find how many hits in this site and put it in the output array
		let page = buildPage(rawHTML);
		let hits = getHitsInPage(page, no_google_crawl.query);
		output.push({url, hits});

		// Never visit this url again
		no_google_crawl.usedURLs.push(url);
		
		// Get all URLs in the page
		let pageLinks = no_google_crawl.getLinksInPage(page, url);
		for (var i = pageLinks.length; i --> 0;) {
			if (getSiteURL(pageLinks[i]) == no_google_crawl.hostname) {
				if (!no_google_crawl.usedURLs.includes(pageLinks[i])) { // If the URL was not visited for recursion yet
					let newQueueURL = {url: pageLinks[i], depth: depth + 1, hits: hits};
					let regexp = new RegExp("[#?&%$!@]+.*" + no_google_crawl.query);
					if ((pageLinks[i].includes(no_google_crawl.query)) &&
						(!regexp.test(pageLinks[i]))) {
				// if (pageLinks[i].includes(no_google_crawl.query)) {
						no_google_crawl.queuedURLs.unshift(newQueueURL)
					} else {
						if (depth > 2) {
							let index = no_google_crawl.getSortedInsertIndex(no_google_crawl.queuedURLs.map(obj => obj.hits), hits);
							no_google_crawl.queuedURLs.splice(index, 0, newQueueURL);
						} else {
							no_google_crawl.queuedURLs.push(newQueueURL);
						}
					}
				}
			}
		}
		
		no_google_crawl.doCrawl(no_google_crawl.queuedURLs.shift(), output);
	});
}

no_google_crawl.crawl = (baseURL, queryParam, output) => {
	// Initiate values and begin recursion crawl
	resetObject(output);
	no_google_crawl.query = queryParam;
	no_google_crawl.hostname = getSiteURL(baseURL);
	no_google_crawl.usedURLs = [];
	no_google_crawl.queuedURLs = [];
	
	crawlIsDone_local = false;
	no_google_crawl.startTime = performance.now();
	no_google_crawl.doCrawl({url: baseURL, depth: 1}, output);
}


chrome.storage.local.get([
	'spider-search-use-google',
	'spider-search-max-timeout',
], function(items) {
	if (typeof items['spider-search-use-google'] !== "boolean") {
		items['spider-search-use-google'] = true;
	}
	crawl = items['spider-search-use-google'] ? google_crawl : no_google_crawl.crawl;

	MAX_TIMEOUT = items['spider-search-max-timeout'] || 2000;
});