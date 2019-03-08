// Saves options to chrome.storage
function save_options() {
	let use_google = document.getElementById('use-google').checked;
	let maxTimeout = document.getElementById('max-timeout').value;

	chrome.storage.local.set({
		'spider-search-use-google': use_google,
		'spider-search-max-timeout': maxTimeout,
	}, function() {
		// Update status to let user know options were saved.
		var status = document.getElementById('status');
		status.textContent = 'Options saved.';
		setTimeout(function() {
			status.textContent = '';
		}, 750);
	});
}
  
// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {

	chrome.storage.local.get([
		'spider-search-use-google',
		'spider-search-max-timeout',
	], function(items) {
		let t = items['spider-search-use-google'];
		document.getElementById('use-google').checked = (t != null && t != undefined) ? t : true;
		document.getElementById('max-timeout').value = items['spider-search-max-timeout'] || 2000;
	});
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save_options').addEventListener('click', save_options);