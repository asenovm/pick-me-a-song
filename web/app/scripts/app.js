'use strict';

angular.module('pickMeASong', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'LocalStorageModule',
  'ngRoute'
])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/recommender.html',
        controller: 'RecommenderController'
      })
      .when('/about', {
        templateUrl: 'views/about.html',
        controller: 'AboutController'
      })
      .when('/recommendations', {
        templateUrl: 'views/recommendations.html',
        controller: 'RecommendationsController'
      })
      .otherwise({
        redirectTo: '/'
      });
  });
