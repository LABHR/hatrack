;(function ($) {
  var cache = {}
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

  function credentialSetup (xhr, settings) {
    xhr.withCredentials = true
    xhr.setRequestHeader('Authorization', 'Basic <<Your Auth Here!>>')
  }

  function cachedRequest (url) {
    if (cache[url]) {
      return cache[url]
    } else {
      var response = cache[url] = $.ajax(url, {
        method: 'GET',
        beforeSend: credentialSetup
      })
      response.then(function (json, status, response) {
        //
      })
      return response
    }
  }

  function parseLinks (linkHeader) {
    // <https://api.github.com/repositories/11407242/contributors?pageSize=10&page=2>; rel="next", <https://api.github.com/repositories/11407242/contributors?pageSize=10&page=3>; rel="last"
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

  function doPagination (sharedCache, url, direction) {
    if (!url || sharedCache[url]) {
      return $.Deferred().resolve([]).promise()
    } else {
      sharedCache[url] = true
      return cachedRequest(url).then(function (json, status, response) {
        var links = parseLinks(response.getResponseHeader('Link'))
        var next_url = links[direction]
        return doPagination(sharedCache, next_url, direction).then(function (runningPagination) {
          if (direction === 'next') {
            return combine(json, runningPagination)
          } else {
            return combine(runningPagination, json)
          }
        })
      })
    }
  }

  function autoPaginate (baseUrl) {
    return cachedRequest(baseUrl).then(function (json, status, response) {
      var linkHeader = response.getResponseHeader('Link')
      if (linkHeader) {
        var links = parseLinks(linkHeader)
        var paginationCache = {}
        return $.when(
          doPagination(paginationCache, links['next'], 'next'),
          doPagination(paginationCache, links['last'], 'prev')
        ).then(function (list1, list2) {
          return combine(json, list1, list2)
        })
      } else {
        return json
      }
    })
  }

  function getUserFullInfo (userInfo) {
    return cachedRequest(userInfo.url).then(function (json, status, xhr) {
      return json
    })
  }

  function getAllUserFullInfo (listOfUsers) {
    var allPromises = []
    listOfUsers.forEach(function (user) {
      allPromises.push(getUserFullInfo(user))
    })
    return whenAll(allPromises).then(function (allUsers) {
      return allUsers
    })
  }

  function codeContributors (repo) {
    var baseUrl = 'https://api.github.com/repos/' + repo + '/contributors?pageSize=30'
    return autoPaginate(baseUrl).then(getAllUserFullInfo)
  }

  function issueContributors (repo) {
    // This API call also includes Pull requests ... sweet.
    var baseUrl = 'https://api.github.com/repos/' + repo + '/issues?pageSize=30&state=all'
    return autoPaginate(baseUrl).then(function (issues) {
      var perIssuePromises = []
      issues.forEach(function (issue) {
        perIssuePromises.push(
          autoPaginate(issue.comments_url).then(function (allComments) {
            var issueUsers = [issue.user]
            allComments.forEach(function (comment) {
              issueUsers.push(comment.user)
            })
            return getAllUserFullInfo(issueUsers)
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

  function labhr (repo) {
    return $.when(
      codeContributors(repo),
      issueContributors(repo)
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

  window.labhr = labhr
})(jQuery)
