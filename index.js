(function ($) {
  var linkRe = /<([^>]+)>; rel="(\w+)"/
  function combine () {
    var arr = []
    Array.prototype.forEach.call(arguments, function (arg) {
      Array.prototype.push.apply(arr, arg)
    })
    return arr
  }
  function parseLinks (linkHeader) {
    var links = {}
    linkHeader.split(', ').forEach(function (linkPart) {
      var re = linkPart.match(linkRe)
      if (re) {
        var url = re[1]
        var rel = re[2]
        links[rel] = url
      }
    })
    return links
  }
  function filterContributors (listOfContributors, usernameStore) {
    var filteredList = []
    // Only send unique contributors out.
    listOfContributors.forEach(function (contributor) {
      if (!usernameStore[contributor.login]) {
        usernameStore[contributor.login] = true
        filteredList.push(contributor)
      }
    })
    return filteredList
  }
  // Functions using jQuery.

  function whenAll (arrayOfPromises) {
    // A warapper around $.when that takes an array and returns a promise the resolves with an
    //  array.
    return $.when.apply($, arrayOfPromises).then(function () {
      // Convert the arguments into an array.
      return Array.prototype.slice.call(arguments)
    })
  }
  function when (/* ... */) {
    return $.when.apply($, arguments)
  }
  function resolvedPromise (value) {
    // It's hacky but it appears to be the best way to get a resolved promise.
    return $.Deferred().resolve(value).promise()
  }

  function Labhr (host, cachedRequest) {
    if (this.constructor !== Labhr) {
      // Handle people calling this function without 'new'.
      return new Labhr(host, cachedRequest)
    }
    this.host = host
    this.cachedRequest = cachedRequest
  }
  window.Labhr = Labhr

  Labhr.prototype.load = function (repo, notifyCallback) {
    var codeContribUsernames = {}
    var allCodeContributors = []
    var nonCodeContribUsernames = {}
    var allNonCodeContributors = []
    var allNonCodeOnlyContributors = []
    function codeContribCB (listOfCodeContributors) {
      var codeContribs = filterContributors(listOfCodeContributors,
                                            codeContribUsernames)
      allCodeContributors = combine(allCodeContributors, codeContribs)
      notifyCallback({
        'codeContributors': codeContribs
      })
    }
    function nonCodeContribCB (listOfNonCodeContributors) {
      var nonCodeContribs = filterContributors(listOfNonCodeContributors,
                                               nonCodeContribUsernames)
      allNonCodeContributors = combine(allNonCodeContributors, nonCodeContribs)
      // Make a copy in case notifyCallback does something horrible.
      var nonCodeContribs_copy = nonCodeContribs.slice(0)
      // This list is for all contributors who have worked on issues(or PRs).
      // There may be overlap between this list and the code contributors list.
      notifyCallback({
        'nonCodeContributors': nonCodeContribs
      })
      // We need to wait until we have all the code contributors before
      //  sending the non-code only contributors.
      listOfCodeContributors.then(function () {
        // Remove any contributors who are code contributors
        var nonCodeOnlyContribs = filterContributors(nonCodeContribs_copy,
                                                     codeContribUsernames)
        allNonCodeOnlyContributors = combine(allNonCodeOnlyContributors,
                                             nonCodeOnlyContribs)
        notifyCallback({
          'nonCodeOnlyContributors': nonCodeOnlyContribs
        })
      })
    }
    var listOfCodeContributors = this.codeContributionLoader(repo, codeContribCB)
    return when(
      listOfCodeContributors,
      this.issueContributionLoader(repo, nonCodeContribCB)
    ).then(function (codeContrib, issueContrib) {
      return {
        'nonCodeContributors': allNonCodeContributors,
        'nonCodeOnlyContributors': allNonCodeOnlyContributors,
        'codeContributors': allCodeContributors
      }
    })
  }

  // Loading extended user information

  Labhr.prototype.getUserExtendedInfo = function (userInfo) {
    return this.cachedRequest(userInfo.url).then(function (json, status, xhr) {
      return json
    })
  }

  Labhr.prototype.getAllUserExtendedInfo = function (listOfUsers) {
    var that = this
    var allPromises = []
    listOfUsers.forEach(function (user) {
      allPromises.push(that.getUserExtendedInfo(user))
    })
    // Return a promise that, when resolved, will give an array containing
    //  all the users and their extending information.
    return whenAll(allPromises)
  }

  // Loading the users from contributors list and issues.

  Labhr.prototype.codeContributionLoader = function (repo, contributorCallback) {
    /**
     * repo: A string containing the repo to load the contributors from.
     * contributorCallback: A function that recieves a list of contributors.
     *                      This list may not be complete or unique.
     */
    var that = this
    var baseUrl = this.host + '/repos/' + repo + '/contributors?pageSize=30'
    return this.autoPaginate(baseUrl, function (listOfContributors) {
      return that.getAllUserExtendedInfo(listOfContributors).then(contributorCallback)
    })
  }

  Labhr.prototype.issueContributionLoader = function (repo, contributorCallback) {
    /**
     * repo: A string containing the repo to load the contributors from.
     * contributorCallback: A function that recieves a list of contributors.
     *                      This list may not be complete or unique.
     */
    var that = this
    var baseUrl = this.host + '/repos/' + repo + '/issues?pageSize=30&state=all'
    return this.autoPaginate(baseUrl, function (listOfIssues) {
      // We need to do 2 things with this list of issues.
      //  - Load the comments for each issue
      //  - Load the user that created the issue.
      var creators = []
      var commentLoadingPromises = []
      listOfIssues.forEach(function (issue) {
        creators.push(issue.user)
        commentLoadingPromises.push(
          that._issueCommenterLoader(issue.comments_url, contributorCallback))
      })
      var creatorsPromise = that.getAllUserExtendedInfo(creators).then(contributorCallback)
      var commentsPromise = whenAll(commentLoadingPromises)
      return when(creatorsPromise, commentsPromise)
    })
  }

  Labhr.prototype._issueCommenterLoader = function (commentsUrl, contributorCallback) {
    /**
     * An internal method to load all the commenters from a single issue.
     *
     * repo: A string containing the repo to load the contributors from.
     * contributorCallback: A function that recieves a list of contributors.
     *                      This list may not be complete or unique.
     */
    var that = this
    return this.autoPaginate(commentsUrl, function (commentsPage) {
      var commenters = []
      commentsPage.forEach(function (comment) {
        commenters.push(comment.user)
      })
      return that.getAllUserExtendedInfo(commenters).then(function (fullUserInformation) {
        // Once we load the information, pass it on to the callback.
        contributorCallback(fullUserInformation)
      })
    })
  }

  // Pagination helpers.

  Labhr.prototype.doPagination = function (sharedCache, url, direction, requestParser) {
    /**
     * Handles recursively fetching pages in the direction given.
     *
     * sharedCache: A dictionary that allows multiple `doPagination` calls to
     *  work alongside each other without accidently duplicating items in the combined results.
     */
    var that = this
    if (!url || sharedCache[url]) {
      // This can probably be done nicer.
      return resolvedPromise([])
    } else {
      sharedCache[url] = true
      return this.cachedRequest(url).then(function (json, status, response) {
        var links = parseLinks(response.getResponseHeader('Link'))
        var next_url = links[direction]
        return when(
          requestParser(json),
          that.doPagination(sharedCache, next_url, direction)
        )
      })
    }
  }

  Labhr.prototype.autoPaginate = function (baseUrl, requestParser) {
    /**
     * baseUrl: The first URL to request. Other page's URLs are taken from the Link header.
     * requestParser: A function that performs some additional processing and
     *                returns a promise or an object. Returned promises will
     *                be waited on before this function returns.
     */
    requestParser = requestParser || function (request) { return request }
    var that = this
    return that.cachedRequest(baseUrl).then(function (json, status, response) {
      var linkHeader = response.getResponseHeader('Link')
      if (linkHeader) {
        var links = parseLinks(linkHeader)
        var paginationCache = {}
        return when(
          requestParser(json),
          that.doPagination(paginationCache, links['next'], 'next', requestParser),
          that.doPagination(paginationCache, links['last'], 'prev', requestParser)
        )
      } else {
        return requestParser(json)
      }
    })
  }
})(window.jQuery)

// Example `cachedRequest` implementation using jQuery.
//
// var cache = {}
// function cachedRequest (url) {
//   if (cache[url]) {
//     return cache[url]
//   } else {
//     var response = cache[url] = $.ajax(url, {
//       method: 'GET',
//       headers: {
//         'Authorization': 'Basic <<Your Auth Here!>>'
//       }
//     })
//     return response
//   }
// }
