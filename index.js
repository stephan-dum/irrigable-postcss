const postcss = require("postcss");
const postcssUrl = require("postcss-url");
const postImport = require("postcss-import");

const applySourceMap = require("vinyl-sourcemaps-apply");
const { Transform } = require("stream");

const toURLPath = require("@aboutweb/irrigable-urlpath");
const path = require("path");

module.exports = function(
  plugins = [],
  processOptions = {},
  pluginOptions = {}
) {



  /*
    possible assets

      @font-face
        src

      mask: url(masks.svg#star);
      mask-image

      border-image

      background
      background-images url()
  */


  plugins = [

    ...plugins
  ];

  class PostCSS extends Transform {
    constructor(input) {
      super({
        objectMode : true
      });

      this.sourcemap = input.sourcemap;

      this.pluginOptions = {
        //"root" : input.cwd

      };

      this.processOptions = processOptions;

      this.plugins = plugins.slice();
    }
    _transform(file, encoding, callback) {
      let from = file.path;
      let extname = file.extname;
      file.extname = ".css";
      let to = file.path;

      let processOptions = {
        ...this.processOptions,
        from,
        to
      };

      if(this.sourcemap) {
        processOptions.map = {
          inline : false,
          annotation : false,
          from
        };
      }

      let base = path.dirname(file.relative);

      let cwd = file.cwd;


      let plugins = [
        postImport({
          resolve(id, baseDir, importOptions) {
            if(path.isAbsolute(id)) {
              return toURLPath(id, cwd);
            }

            return path.join(baseDir, id);
          }
        }),
        ...this.plugins,
        postcssUrl({
          url : (asset, dir) => {
            let url = toURLPath(asset.url, cwd);

            file.input.reference(file.path, url);

            return url;
          }
        })
      ]

      postcss(plugins).process(
        file.contents.toString(),
        processOptions,
        this.pluginOptions
      ).then((result) => {
        let { css, map } = result;



        file.contents = new Buffer(css);
        /*map = map.toJSON();
        map.file = file.relative;
        map.sources = map.sources.map((source) => {
         return path.join(path.dirname(file.relative), source)
       });
        applySourceMap(file, map)
        */
        if(this.sourcemap) {
          applySourceMap(file, map.toJSON());
        }

        callback(null, file);
      }, callback);
    }

  }



  return {
    construct : PostCSS
  };

  /*return {
    invoke : postcss,
    args : [[precss()]]
  };*/
}
