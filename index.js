;(function ($) {
  // var cache = {}
  var linkRe = /<([^>]+)>; rel="(\w+)"/

  function combine () {
    var arr = []
    Array.prototype.forEach.call(arguments, function (arg) {
      Array.prototype.push.apply(arr, arg)
    })
    return arr
  }
  function combineAll (arrayOfArrays) {
    var arr = []
    Array.prototype.forEach.call(arrayOfArrays, function (innerArray) {
      Array.prototype.push.apply(arr, innerArray)
    })
    return arr
  }
  function whenAll (arrayOfPromises) {
    // A warapper around $.when that takes an array and returns a promise the resolves with an
    //  array.
    return $.when.apply($, arrayOfPromises).then(function () {
      // Convert the arguments into an array.
      return Array.prototype.slice.call(arguments)
    })
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
  // Labhr.prototype.credentialSetup = function (xhr, settings) {
  //   xhr.withCredentials = true
  //   xhr.setRequestHeader('Authorization', 'Basic <<Your Auth Here!>>')
  // }
  //
  // Labhr.prototype.cachedRequest = function (url) {
  //   if (cache[url]) {
  //     return cache[url]
  //   } else {
  //     var response = cache[url] = $.ajax(url, {
  //       method: 'GET',
  //       beforeSend: this.credentialSetup
  //     })
  //     response.then(function (json, status, response) {
  //       //
  //     })
  //     return response
  //   }
  // }

  Labhr.prototype.doPagination = function (sharedCache, url, direction) {
    var that = this
    if (!url || sharedCache[url]) {
      return $.Deferred().resolve([]).promise()
    } else {
      sharedCache[url] = true
      return this.cachedRequest(url).then(function (json, status, response) {
        var links = parseLinks(response.getResponseHeader('Link'))
        var next_url = links[direction]
        return that.doPagination(sharedCache, next_url, direction).then(
          function (runningPagination) {
            if (direction === 'next') {
              return combine(json, runningPagination)
            } else {
              return combine(runningPagination, json)
            }
          })
      })
    }
  }

  Labhr.prototype.autoPaginate = function (baseUrl) {
    var that = this
    return that.cachedRequest(baseUrl).then(function (json, status, response) {
      var linkHeader = response.getResponseHeader('Link')
      if (linkHeader) {
        var links = parseLinks(linkHeader)
        var paginationCache = {}
        return $.when(
          that.doPagination(paginationCache, links['next'], 'next'),
          that.doPagination(paginationCache, links['last'], 'prev')
        ).then(function (list1, list2) {
          return combine(json, list1, list2)
        })
      } else {
        return json
      }
    })
  }

  Labhr.prototype.getUserFullInfo = function (userInfo) {
    return this.cachedRequest(userInfo.url).then(function (json, status, xhr) {
      return json
    })
  }

  Labhr.prototype.getAllUserFullInfo = function (listOfUsers) {
    var that = this
    var allPromises = []
    listOfUsers.forEach(function (user) {
      allPromises.push(that.getUserFullInfo(user))
    })
    return whenAll(allPromises).then(function (allUsers) {
      return allUsers
    })
  }

  Labhr.prototype.codeContributors = function (host, repo) {
    var that = this
    var baseUrl = host + '/repos/' + repo + '/contributors?pageSize=30'
    return this.autoPaginate(baseUrl).then(function (users) {
      return that.getAllUserFullInfo(users)
    })
  }

  Labhr.prototype.issueContributors = function (host, repo) {
    var that = this
    // This API call also includes Pull requests(I think) ... sweet.
    var baseUrl = host + '/repos/' + repo + '/issues?pageSize=30&state=all'
    return this.autoPaginate(baseUrl).then(function (issues) {
      var perIssuePromises = []
      issues.forEach(function (issue) {
        perIssuePromises.push(
          that.autoPaginate(issue.comments_url).then(function (allComments) {
            var issueUsers = [issue.user]
            allComments.forEach(function (comment) {
              issueUsers.push(comment.user)
            })
            return that.getAllUserFullInfo(issueUsers)
          })
        )
      })
      return whenAll(perIssuePromises).then(function (issueUsers) {
        return combineAll(issueUsers)
      }).then(function (allUsers) {
        var issueUserLogins = {}
        var finalList = []
        allUsers.forEach(function (user) {
          if (!issueUserLogins[user.login]) {
            issueUserLogins[user.login] = true
            finalList.push(user)
          }
        })
        return finalList
      })
    })
  }

  function Labhr (host, repo, cachedRequest) {
    if (this.constructor != Labhr) {
      return new Labhr(host, repo, cachedRequest)
    }
    this.host = host
    this.repo = repo
    this.cachedRequest = cachedRequest
  }

  Labhr.prototype.load = function () {
    return $.when(
      this.codeContributors(this.host, this.repo),
      this.issueContributors(this.host, this.repo)
    ).then(function (codeContrib, issueContrib) {
      var codeContribUsernames = {}
      codeContrib.forEach(function (user) {
        codeContribUsernames[user.login] = true
      })
      var issueOnlyContrib = []
      issueContrib.forEach(function (user) {
        if (!codeContribUsernames[user.login]) {
          issueOnlyContrib.push(user)
        }
      })
      return {
        issuesContributors: issueContrib,
        issuesOnlyContributors: issueOnlyContrib,
        codeContributors: codeContrib
      }
    })
  }

  window.Labhr = Labhr
})(jQuery)
