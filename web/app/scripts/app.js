'use strict';

angular.module('pickMeASong', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute'
])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/recommender.html',
        controller: 'RecommenderController'
      })
      .otherwise({
        redirectTo: '/'
      });
  });
