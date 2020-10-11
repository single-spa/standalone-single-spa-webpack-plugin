const HtmlWebpackPlugin = require("safe-require")("html-webpack-plugin");

const pluginName = `StandaloneSingleSpaPlugin`;

const defaultOptions = {
  isParcel: false,
  activeWhen: ["/"],
  importMap: { imports: {} },
  HtmlWebpackPlugin,
};

class StandaloneSingleSpaPlugin {
  /**
   *
   * @typedef {{
   * imports: object;
   * scopes: object;
   * }} ImportMap
   *
   * @param {{
   * appOrParcelName: string;
   * isParcel?: boolean;
   * activeWhen?: string[];
   * importMapUrl?: URL;
   * importMap?: ImportMap;
   * HtmlWebpackPlugin?: any;
   * }} options
   */
  constructor(options) {
    if (!options) {
      throw Error(`${pluginName}: options object is required`);
    }

    if (typeof options.appOrParcelName !== "string") {
      throw Error(
        `${pluginName}: the options.appOrParcelName string must be provided`
      );
    }

    this.options = {
      ...defaultOptions,
      ...options,
    };
  }
  apply(compiler) {
    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      let publicPath;

      this.options.HtmlWebpackPlugin.getHooks(
        compilation
      ).beforeAssetTagGeneration.tap(pluginName, (data) => {
        publicPath = data.assets.publicPath;
      });

      this.options.HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tap(
        pluginName,
        (data) => {
          const mainScript = data.assetTags.scripts[0];

          const importMap = {
            imports: {
              [this.options.appOrParcelName]:
                publicPath || "/" + mainScript.attributes.src,
            },
          };

          for (let name in this.options.importMap.imports) {
            importMap[name] = this.options.importMap.imports[name];
          }

          const pluginRuntime = this.options.isParcel
            ? this.parcelRuntime()
            : this.applicationRuntime();

          // Delete the main script
          data.assetTags.scripts.splice(0, 1);

          if (this.options.importMapUrl) {
            data.assetTags.scripts.push({
              tagName: "script",
              voidTag: false,
              attributes: {
                type: "systemjs-importmap",
                src: this.options.importMapUrl.href,
              },
            });
          }
          data.assetTags.scripts.push({
            tagName: "script",
            voidTag: false,
            attributes: { type: "systemjs-importmap" },
            innerHTML: JSON.stringify(importMap, null, 2),
          });
          data.assetTags.scripts.push({
            tagName: "script",
            voidTag: false,
            attributes: {
              defer: false,
              src: "https://cdn.jsdelivr.net/npm/systemjs/dist/system.js",
            },
          });
          data.assetTags.scripts.push({
            tagName: "script",
            voidTag: false,
            attributes: {
              defer: false,
              src: "https://cdn.jsdelivr.net/npm/systemjs/dist/extras/amd.js",
            },
          });
          data.assetTags.scripts.push({
            tagName: "script",
            voidTag: false,
            attributes: {
              defer: false,
              src:
                "https://cdn.jsdelivr.net/npm/systemjs/dist/extras/named-exports.js",
            },
          });
          data.assetTags.scripts.push({
            tagName: "script",
            voidTag: false,
            innerHTML: pluginRuntime,
          });
        }
      );
    });
  }
  applicationRuntime() {
    return `
      System.import('single-spa').then(function (singleSpa) {
        singleSpa.registerApplication({
          name: '${this.options.appOrParcelName}',
          app: function () {
            return System.import('${this.options.appOrParcelName}');
          },
          activeWhen: ${JSON.stringify(this.options.activeWhen)}
        });
        if (!window.location.pathname.startsWith('${
          this.options.activeWhen[0]
        }')) {
          singleSpa.navigateToUrl('${this.options.activeWhen[0]}');
        }
        singleSpa.start();
      });
    `
      .trim()
      .replace(/\n      /g, "\n");
  }
  parcelRuntime() {
    return `
      Promise.all([System.import('single-spa'), System.import('${this.options.appOrParcelName}')]).then(function (values) {
        const singleSpa = values[0];
        const parcelConfig = values[1];
        const parcelContainer = document.createElement('div');
        parcelContainer.id = 'parcel-container';
        document.body.appendChild(parcelContainer);
        singleSpa.mountRootParcel(parcelConfig, { domElement: parcelContainer, name: '${this.options.appOrParcelName}' });
      });
    `;
  }
}

module.exports = StandaloneSingleSpaPlugin;
