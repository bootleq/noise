module.exports = function(grunt) {
	require('load-grunt-tasks')(grunt);

	grunt.initConfig({
		sass: {
      dist: {
        options: {
          unixNewlines: true,
          style:        'expanded',
          update:       true
        },
        files: [{
          expand: true,
          src: ['**/*.scss'],
          ext: '.css'
        }]
      }
    },

    watch: {
      scripts: {
        files: '**/*.scss',
        tasks: ['sass'],
      }
    }
	});
};
