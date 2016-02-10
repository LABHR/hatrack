Let's All Build a Hat Rack -- JavaScript
========================================

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com/)

To run, simply open `index.html`.

To run the linter install the dependancies using `npm install` and then run the linter `npm run lint`

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
