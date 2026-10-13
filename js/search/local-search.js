// A local search script with the help of
// [hexo-generator-search](https://github.com/PaicHyperionDev/hexo-generator-search)
// Copyright (C) 2015
// Joseph Pan <http://github.com/wzpan>
// Shuhao Mao <http://github.com/maoshuhao>
// This library is free software; you can redistribute it and/or modify
// it under the terms of the GNU Lesser General Public License as
// published by the Free Software Foundation; either version 2.1 of the
// License, or (at your option) any later version.
//
// This library is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// Lesser General Public License for more details.
//
// You should have received a copy of the GNU Lesser General Public
// License along with this library; if not, write to the Free Software
// Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA
// 02110-1301 USA
//
// Modified by:
// Pieter Robberechts <http://github.com/probberechts>

/*exported searchFunc*/
var searchFunc = function(path, filter, wrapperId, searchId, contentId) {
  var $input = document.getElementById(searchId);
  var $resultContent = document.getElementById(contentId);
  var $wrapper = document.getElementById(wrapperId);
  if (!$input || !$resultContent || !$wrapper || $input.stellarSearchInitialized) { return; }
  $input.stellarSearchInitialized = true;

  function getAllCombinations(keywords) {
    var i, j, result = [];

    for (i = 0; i < keywords.length; i++) {
        for (j = i + 1; j < keywords.length + 1; j++) {
            result.push(keywords.slice(i, j).join(" "));
        }
    }
    return result;
  }

  $.ajax({
    url: path,
    dataType: "json",
    error: function() {
      $input.stellarSearchInitialized = false;
    },
    success: function(jsonResponse) {
      var originalDatas = null;
      var normalizedDatas = null;
      var searchRevision = 0;

      function prepareDatas(normalize) {
        return jsonResponse.map(function(data) {
          var title = data.title?.trim() || 'Untitled';
          var content = normalize(data.content || '');
          return {
            title: title,
            titleLowerCase: normalize(title).toLowerCase(),
            originalContent: data.content || '',
            content: content,
            contentLowerCase: content.toLowerCase(),
            path: data.path
          };
        });
      }

      async function performSearch() {
        var revision = ++searchRevision;
        var query = $input.value.trim();
        $resultContent.innerHTML = "";
        if (query.length <= 0) {
          $wrapper.setAttribute('searching', 'false');
          return;
        }
        $wrapper.setAttribute('searching', 'true');

        var language = window.StellarLanguage;
        var normalize = function(text) { return text; };
        var canNormalize = false;
        if (language && typeof language.ready === 'function') {
          try {
            await language.ready();
            canNormalize = typeof language.normalizeSearch === 'function';
          } catch (error) {
            // Local search remains available if the converter cannot load.
          }
        }
        // A newer input may have arrived while the converter was loading.
        if (revision !== searchRevision) { return; }
        var datas;
        if (canNormalize) {
          normalize = function(text) { return language.normalizeSearch(text); };
          normalizedDatas = normalizedDatas || prepareDatas(normalize);
          datas = normalizedDatas;
        } else {
          originalDatas = originalDatas || prepareDatas(normalize);
          datas = originalDatas;
        }

        var resultList = [];
        var keywords = getAllCombinations(normalize(query).toLowerCase().split(/\s+/))
          .sort(function(a,b) { return b.split(" ").length - a.split(" ").length; });
        var regS = new RegExp(keywords.map(function(keyword) {
          return keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }).join("|"), "gi");
        // perform local searching
        datas.forEach(function(data) {
          if (!data.content?.trim().length) { return }
          var matches = 0;
          if (filter && !data.path.includes(filter)) { return }
          var dataTitle = data.title;
          var dataTitleLowerCase = data.titleLowerCase;
          var dataContent = data.content;
          var dataContentLowerCase = data.contentLowerCase;
          var dataUrl = data.path.startsWith('//') ? data.path.slice(1) : data.path; // 避免文章设置永久链接导致点击打开失败
          var indexTitle = -1;
          var indexContent = -1;
          var firstOccur = -1;
          // only match artiles with not empty contents
          if (dataContent !== "") {
            keywords.forEach(function(keyword) {
              indexTitle = dataTitleLowerCase.indexOf(keyword);
              indexContent = dataContentLowerCase.indexOf(keyword);

              if( indexTitle >= 0 || indexContent >= 0 ){
                matches += 1;
                if (indexContent < 0) {
                  indexContent = 0;
                }
                if (firstOccur < 0) {
                  firstOccur = indexContent;
                }
              }
            });
          }
          // show search results
          if (matches > 0) {
            var searchResult = {};
            searchResult.rank = matches;
            searchResult.str = "<li><a href='"+ dataUrl +"'><span class='search-result-title'>"+ dataTitle +"</span>";
            if (firstOccur >= 0) {
              // cut out 100 characters
              var start = firstOccur - 20;
              var end = firstOccur + 80;

              if(start < 0){
                start = 0;
              }

              if(start == 0){
                end = 100;
              }

              if(end > dataContent.length){
                end = dataContent.length;
              }

              var matchContent;
              if (data.originalContent.length === dataContent.length) {
                var originalSnippet = data.originalContent.substring(start, end);
                var normalizedSnippet = dataContent.substring(start, end);
                var cursor = 0;
                matchContent = '';
                // Match normalized text while retaining every original character.
                normalizedSnippet.replace(regS, function(keyword, offset) {
                  matchContent += originalSnippet.substring(cursor, offset)
                    + '<span class="search-keyword">'
                    + originalSnippet.substring(offset, offset + keyword.length)
                    + '</span>';
                  cursor = offset + keyword.length;
                  return keyword;
                });
                matchContent += originalSnippet.substring(cursor);
              } else {
                matchContent = data.originalContent.substring(0, 100);
              }

              searchResult.str += "<p class=\"search-result-content\">" + matchContent +"...</p>";
            }
            searchResult.str += "</a></li>";
            resultList.push(searchResult);
          }
        });
        if (resultList.length) {
          resultList.sort(function(a, b) {
              return b.rank - a.rank;
          });
          var result ="<ul class=\"search-result-list\">";
          for (var i = 0; i < resultList.length; i++) {
            result += resultList[i].str;
          }
          result += "</ul>";
          $resultContent.innerHTML = result;
        }
      }

      $input.addEventListener("input", performSearch);
      window.addEventListener('stellar:languagechange', performSearch);
      performSearch();
    }
  });
};

utils.jq(() => {
  var $inputArea = $("input#search-input");
    if ($inputArea.length == 0) {
      return;
    }
    var $resultArea = document.querySelector("div#search-result");
    function initializeSearch() {
      var path = ctx.search.path;
      if (path.startsWith('/')) {
        path = path.substring(1);
      }
      path = ctx.root + path;
      const filter = $inputArea.attr('data-filter') || '';
      searchFunc(path, filter, 'search-wrapper', 'search-input', 'search-result');
    }
    $inputArea.focus(initializeSearch);
    if ($inputArea[0] === document.activeElement) {
      initializeSearch();
    }
    $inputArea.keydown(function(e) {
      if (e.which == 13) {
        e.preventDefault();
      }
    });
    var observer = new MutationObserver(function(mutationsList, observer) {
      if (mutationsList.length == 1) {
        if (mutationsList[0].addedNodes.length) {
          $('.search-wrapper').removeClass('noresult');
        } else if (mutationsList[0].removedNodes.length) {
          $('.search-wrapper').addClass('noresult');
        }
      }
    });
    observer.observe($resultArea, { childList: true });
  });
