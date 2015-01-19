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
      .when('/settings', {
        templateUrl: 'views/settings.html',
        controller: 'SettingsController'
      })
      .when('/recommendations', {
        templateUrl: 'views/recommendations.html',
        controller: 'RecommendationsController'
      })
      .when('/rateItems', {
        templateUrl: 'views/rate.html',
        controller: 'RecommenderController'
      })
      .otherwise({
        redirectTo: '/'
      });
  });
