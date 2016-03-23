Let's All Build a Hat Rack -- JavaScript
========================================

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

To run, simply open `index.html`.

To run the linter install the dependancies using `npm install` and then run the linter `npm run lint`


## How to save a static version of the js-hatrack page

* **Problem**: At the moment you can only see the contributors for a github repo via https://labhr.github.io/js-hatrack/ if you're logged into GitHub (because the information is pulled in real time to create the webpage and you need to be verified by GitHub to be allowed to send enough requests to compile the information). I'd like to host a page on my website that means ***anyone*** can see who has contributed without requiring the buy in of creating a GitHub account.

* **Solution**: A project member logs in with GitHub and create the lovely looking page via https://labhr.github.io/js-hatrack/ then saves a non-dynamic copy using the [Scrapbook](https://addons.mozilla.org/en-US/firefox/addon/scrapbook/) Firefox add on.

**Instructions**

* Install the [Scrapbook](https://addons.mozilla.org/en-US/firefox/addon/scrapbook/) Firefox add on
* Create the Lets Build a Hat Rack contributers page for your project:
  * Go to https://labhr.github.io/js-hatrack/
  * Login with GitHub 
  * Enter the repository name
  * Click go!
* Save the page to your local machine using Scrapbook (click `alt` to see the Firefox browser menu). * Copy this folder (which is helpfully named with the date and time that you downloaded it) to your website's folder.

**And you're done!** :tada: :sparkles: 

Here's an example: http://kirstiejane.github.io/STEMMRoleModels/octohatrack_output/Scrapbook_20160317092940/index.html



TODO
----

 - [ ] Handle errors in some graceful way.
 - [ ] Be able to display data whilst it is loading.
 - [ ] Download issue information faster. Specifically once a single issue page is downloaded, start
        downloading the comment lists.
 - [ ] Remove all direct dependancies on jQuery, simply rely on 1 or 2 externally defined functions to
        allow the implementer to choose their own libraries.
 - [ ] Implement a cache that persists across page loads. Currently the browser caches most requests,
        however if we were able to have a persistent cache we could implement more aggressive caching
        such as the kinds described on
        [this issue](https://github.com/LABHR/octohatrack/issues/34#issuecomment-182282194)
 - [ ] Add support for restricting the number of issues retrieved. Either through a form field or
        after the first issues request popping up a notification along the lines of 'Too many issues
        to comb through, how about we limit it to the last year?'.
