/* ------- How to grunt -------
npm install -g grunt-cli
npm install requirejs/text
npm install grunt-contrib-copy --save-dev
npm install grunt-contrib-requirejs --save-dev
grunt
*/

module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig( {
		pkg: grunt.file.readJSON('package.json'),

		requirejs: {
			compile: {
				options: {
					baseUrl: "src",
					include: ["dataoverviewer_dev"],
					out: "dist/dataoverviewer.js",
					exclude: ['text'],
					inlineText: true,
					paths: {
						qlik: "empty:",
						text: "../node_modules/text/text"
					},
					optimize: 'none',
					onBuildWrite: function (moduleName, path, contents) {

						// Remove relative paths when optimizing with requirejs
						var result = contents.replace( /\.\/js/g, 'js' );
						result = result.replace( /\.\.\/html/g, 'html' );
						result = result.replace( /\.\/html/g, 'html' );
						result = result.replace( /\.\/css/g, 'css' );

						// Remove name attr from "main" module (not working in sense otherwise)
						return result.replace( /define\( 'dataoverviewer_dev',/g, 'define\(' );
					}
				}
			}
		},

		copy: {
			main: {
				files: [
					// includes files within path and its sub-directories
					{
						src: ['src/dataoverviewer_dev.qext'],
						dest: 'dist/dataoverviewer.qext',
						flatten: true
					},
					{
						expand: true,
						src: ['src/dataoverviewer.png'],
						dest: 'dist',
						flatten: true
					}
				]
			}
		}
	} );

	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-requirejs');

	grunt.registerTask('writeqext', function () {

		var packagePath = 'package.json';
		var qextPath = './src/dataoverviewer_dev.qext';

		if (!grunt.file.exists(qextPath)) {
			grunt.log.error("file " + qextPath + " not found");
			return false;
		}

		var packageFile = grunt.file.readJSON(packagePath);
		var qextFile = grunt.file.readJSON(qextPath);

		qextFile.version = packageFile.version;

		grunt.file.write(qextPath, JSON.stringify(qextFile, null, 2));
	});

	grunt.registerTask('writeqext', function () {

		var packagePath = 'package.json';
		var qextPath = './src/dataoverviewer_dev.qext';

		if (!grunt.file.exists(qextPath)) {
			grunt.log.error("file " + qextPath + " not found");
			return false;
		}

		var packageFile = grunt.file.readJSON(packagePath);
		var qextFile = grunt.file.readJSON(qextPath);

		qextFile.version = packageFile.version;

		grunt.file.write(qextPath, JSON.stringify(qextFile, null, 2));
	});

	grunt.registerTask('removedev', function () {

		var qextPath = './dist/dataoverviewer.qext';

		if (!grunt.file.exists(qextPath)) {
			grunt.log.error("file " + qextPath + " not found");
			return false;
		}

		var qextFile = grunt.file.readJSON(qextPath);

		qextFile.name = 'Data Overviewer'; // name in src file is Data Overviewer dev

		grunt.file.write(qextPath, JSON.stringify(qextFile, null, 2));
	});

	// Default task(s).
	grunt.registerTask('default', ['writeqext', 'requirejs', 'copy', 'removedev']);

};