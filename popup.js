let queryResults;
let activeTabURL;

chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
	activeTabURL = tabs[0].url;
	if (activeTabURL.startsWith("chrome://")) {
		$("body").html("<h2>Cannot search in chrome:// URLs</h2>")
	}
});

function searchQuery(query) {
	queryResults = [];

	$("#wtfii-button").addClass("is-loading");

	crawl(activeTabURL, query, queryResults);

	let t = setInterval(() => {
		if (crawlIsDone()) {
			clearInterval(t);

			if (queryResults.length == 0) {
				$("#results").html("<div style=\"margin-top:10px\"><span>Could not find any results</span></div>");
				$("#wtfii-button").removeClass("is-loading");
			} else {
				let rawHTML = [];
				rawHTML.push("<table class=\"table is-striped\">");
				rawHTML.push("<tbody>");
				rawHTML.push(	"<tr>",
								"<th>",
									"URL",
								"</th>",
								"<th>",
									"Match",
								"</th>",
							"</tr>",
				);
				
				queryResults = queryResults.sort((a, b) => b.hits - a.hits).slice(0, 5);
				let mostHits = queryResults[0].hits;

				for (let i = 0; i < queryResults.length; i++) {
					let compareHits = Math.max(mostHits, 50);
					queryResults[i].grade = Math.pow(100*(2*(queryResults[i].hits / compareHits) + (queryResults[i].hits / 50))/3, 0.75);
				};

				// Apply grade multipliers
				for (let i = 0; i < queryResults.length; i++) {
					if (!queryResults[i].wideSearch) {
						queryResults[i].grade *= 1.5;
					}
					if (queryResults[i].url.includes(query)) {
						queryResults[i].grade *= 1.5;
					}
					if (queryResults[i].url.endsWith(query) ||
						queryResults[i].url.endsWith(query + "/")) {
						queryResults[i].grade *= 6;
					}
				};

				queryResults = queryResults.sort((a, b) => b.grade - a.grade);

				let baseRelative = (queryResults[0].grade > 50) ? queryResults[0].grade : 50;
				for (let i = 0; i < queryResults.length; i++) {
					queryResults[i].match = 100 * queryResults[i].grade / baseRelative;
				};

				if (queryResults[1].match < 1) {
					queryResults[0].match = Math.min(100, Math.pow(queryResults[0].match, 2.2));
				}
		
				for (let i = 0; i < queryResults.length; i++) {
					let match = Math.floor(queryResults[i].match) + "%";
					let shortURL = queryResults[i].url.substr(8);
					shortURL = (shortURL.length < 50) ? shortURL : shortURL.substr(0, 50) + "...";
					let link = "<a id='url_" + i + "'>" + shortURL + "</a>";
					rawHTML.push(	"<tr>",
									"<td>",
										link,
									"</td>",
									"<td>",
										match,
									"</td>",
								"</tr>",
					);
				};
					
				rawHTML.push("</tbody>");
				rawHTML.push("</table>");
				
				$("#results").hide();
				$("#results").html(rawHTML.join(""));
				$("#results").fadeIn("slow");
				
				for (let i = 0; i < 5; i++) {
					$("#url_" + i).on("click", function() {
						chrome.tabs.create({url: queryResults[i].url + "#" + query});
					});
				}
		
				$("#wtfii-button").removeClass("is-loading");
				initSelector();	
			}
		}
	}, 100)

	let x = setTimeout(() => {
		clearTimeout(x);
		
		if (!crawlIsDone() && $("#wtfii-button").hasClass("is-loading")) {
			$("#results").html("<div style=\"margin-top:10px\"><span>This is taking too long. Are you sure you are connected to the internet?</span></div>");
		}
	}, 4000)
}

function initSelector() {
	$("#wtfii-button").focus();

	let curSelectedIndex = 0;
	$("#url_" + curSelectedIndex).addClass("hovered");

	spiderKeyDown = function() {
		if (event.keyCode == 13)  { // 13 = Return keycode
			$("#url_" + curSelectedIndex).click();
			event.preventDefault();
			return;
		} else if (event.keyCode == 40) { // 40 = Downarrow keycode
			curSelectedIndex = (curSelectedIndex + 1) % queryResults.length;
			event.preventDefault();
		} else if (event.keyCode == 38) { // 38 = Uparrow keycode
			if (curSelectedIndex == 0) {
				curSelectedIndex = queryResults.length - 1;
			} else {
				curSelectedIndex -= 1;
			}
			event.preventDefault();
		}
	
		$("a").removeClass("hovered");
		$("#url_" + curSelectedIndex).addClass("hovered");
	}
}

$("#wtfii-button").on("click", () => {
	let query = $("#wtfii-input").val().toLowerCase();
	searchQuery(query);
});

$("#wtfii-input").on("focus", () => {
    spiderKeyDown = null;
});

$("#wtfii-input").keyup((event) => {
    if (event.keyCode == 13) { // 13 = Return keycode
        $("#wtfii-button").click();
    }
});

$(document).keydown(() => {
	if (spiderKeyDown) {
		spiderKeyDown();
	}
});