const HtmlWebpackPlugin = require("safe-require")("html-webpack-plugin");

const pluginName = `StandaloneSingleSpaPlugin`;

const defaultOptions = {
  isParcel: false,
  activeWhen: ["/"],
  importMap: { imports: {} },
  disabled: false,
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
   * activeWhen?: string[];
   * importMapUrl?: URL;
   * importMap?: ImportMap;
   * isParcel?: boolean;
   * disabled?: boolean;
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
          const mainScriptSrc = publicPath || "/" + mainScript.attributes.src;

          if (this.options.disabled) {
            data.assetTags.scripts.push({
              tagName: "main",
              voidTag: false,
              innerHTML: this.getDisabledHtml({ mainScriptSrc }),
            });

            return;
          }

          // Delete the main script, since it will be loaded later by SystemJS
          data.assetTags.scripts.splice(0, 1);

          const importMap = {
            imports: {
              [this.options.appOrParcelName]: mainScriptSrc,
            },
          };

          for (let name in this.options.importMap.imports) {
            importMap[name] = this.options.importMap.imports[name];
          }

          const pluginRuntime = this.options.isParcel
            ? this.parcelRuntime()
            : this.applicationRuntime();

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
  getDisabledHtml({ mainScriptSrc }) {
    return `
      <h1>Your Microfrontend is not here</h1>
      <p>
        The ${this.options.appOrParcelName} microfrontend is running in "integrated" mode, since standalone-single-spa-webpack-plugin is disabled. This means that
        it does not work as a standalone application without changing configuration.
      </p>
      <h2>How do I develop this microfrontend?</h2>
      <p>
        To develop this microfrontend, try the following steps:
        <ol>
          <li>
            Copy the following URL to your clipboard: <a target="_blank" rel="noopener" id="mf-url"></a>
          </li>
          <li>
            In a new browser tab, go to the your single-spa web app. This is where your "root config" is running. You do not have to run the root config locally
            if it is already running on a deployed environment - go to the deployed environment directly.
          </li>
          <li>
            In the browser console, run <code>localStorage.setItem('devtools', true);</code> Refresh the page.
          </li>
          <li>
            A yellowish rectangle should appear at the bottom right of your screen. Click on it. Find the name ${this.options.appOrParcelName}
            and click on it. If it is not present, click on Add New Module.
          </li>
          <li>
            Paste the URL above into the input that appears. Refresh the page.
          </li>
          <li>
            Congrats, your local code is now being used!
          </li>
        </ol>
      </p>
      <p>
        For further information about "integrated" mode, see the following links:
        <ul>
          <li>
            <a target="_blank" rel="noopener" href="https://single-spa.js.org/docs/recommended-setup#local-development">
              Local Development Overview
            </a>
          </li>
          <li>
            <a target="_blank" rel="noopener" href="https://github.com/joeldenning/import-map-overrides">
              Import Map Overrides Documentation
            </a>
          </li>
        </ul>
      </p>
      <h2>If you prefer Standalone mode</h2>
      <p>
        To run this microfrontend in "standalone" mode, the standalone-single-spa-webpack-plugin must not be disabled. More details
        at the
        <a target="_blank" rel="noopener" href="https://github.com/single-spa/standalone-single-spa-webpack-plugin">Standalone Plugin Documentation</a>.
      </p>
      <script>
        const mfLink = document.getElementById('mf-url');
        const fullSrc = new URL('${mainScriptSrc}', window.location.href);
        mfLink.href = fullSrc;
        mfLink.textContent = fullSrc;
      </script>
    `;
  }
}

module.exports = StandaloneSingleSpaPlugin;
