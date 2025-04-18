import { StartOpts } from "single-spa";
import type HtmlWebpackPlugin from "html-webpack-plugin";

const pluginName = `StandaloneSingleSpaPlugin`;

const defaultOptions: Omit<
  StandaloneSingleSpaPluginOptions,
  "appOrParcelName" | "HtmlWebpackPlugin"
> = {
  customProps: {},
  isParcel: false,
  activeWhen: ["/"],
  importMap: { imports: {} },
  disabled: false,
  moduleFormat: "esm",
  importMapOverrides: true,
  importMapOverridesLocalStorageKey: null,
  startOptions: {
    urlRerouteOnly: true,
  },
};

interface ImportMap {
  imports: Record<string, string>;
  scopes?: Record<string, Record<string, string>>;
}

interface StandaloneSingleSpaPluginOptions {
  appOrParcelName: string;
  activeWhen?: string[];
  moduleFormat: "esm" | "systemjs";
  importMapUrl?: URL;
  importMapUrls?: URL[];
  importMap?: ImportMap;
  isParcel?: boolean;
  disabled?: boolean;
  importMapOverrides?: boolean;
  importMapOverridesLocalStorageKey?: string;
  HtmlWebpackPlugin: HtmlWebpackPlugin;
  customProps: object;
  startOptions: StartOpts;
}

export default class StandaloneSingleSpaPlugin {
  private options: StandaloneSingleSpaPluginOptions;
  private importMethod: string;

  constructor(options: StandaloneSingleSpaPluginOptions) {
    if (!options) {
      throw Error(`${pluginName}: options object is required`);
    }

    if (typeof options.appOrParcelName !== "string") {
      throw Error(
        `${pluginName}: the options.appOrParcelName string must be provided`,
      );
    }

    this.options = {
      ...defaultOptions,
      ...options,
    };

    this.importMethod =
      this.options.moduleFormat === "esm" ? "import" : "System.import";
  }
  apply(compiler) {
    compiler.hooks.compilation.tap(pluginName, (compilation) => {
      const compilationHooks =
        // @ts-expect-error
        this.options.HtmlWebpackPlugin.getCompilationHooks(compilation);
      compilationHooks.alterAssetTags.tap(pluginName, (data) => {
        this.modifyScripts({ scripts: data.assetTags.scripts });
        return data;
      });
    });
  }
  modifyScripts({ scripts }) {
    if (scripts.modifiedBySingleSpaStandalonePlugin) {
      throw Error(
        `standalone-single-spa-webpack-plugin: You have two separate instances of standalone-single-spa-webpack-plugin in your webpack config. If using webpack-config-single-spa or vue-cli-plugin-single-spa, you do not need to manually add the standalone plugin since it's already added by those projects.`,
      );
    }

    if (scripts.length === 0) {
      throw Error(
        `standalone-single-spa-webpack-plugin: HtmlWebpackPlugin must generate at least one <script> in its output, but did not. This usually indicates that there is a problem with your webpack configuration.`,
      );
    }

    const mainScript = scripts[0];
    if (mainScript.tagName !== "script" || !mainScript.attributes.src) {
      throw Error(
        `standalone-single-spa-webpack-plugin: HtmlWebpackPlugin contains an HTML element that's not a <script> with a 'src' attribute in its scripts array. Found ${mainScript.tagName}. This usually indicates a problem with your webpack configuration`,
      );
    }

    scripts.modifiedBySingleSpaStandalonePlugin = true;

    let mainScriptSrc = "/" + mainScript.attributes.src;
    if (mainScriptSrc.startsWith("//")) {
      // html-webpack-plugin@3 provides script src differently than v4, so this
      // fixes things for v3
      mainScriptSrc = mainScriptSrc.slice(1);
    }

    if (this.options.disabled) {
      // don't load the scripts - just show the disabled html
      scripts.splice(0, scripts.length);

      scripts.push({
        tagName: "main",
        voidTag: false,
        innerHTML: this.getDisabledHtml({ mainScriptSrc }),
      });

      return;
    }

    // Delete the main script, since it will be loaded later
    scripts.splice(0, 1);

    const importMap = {
      imports: {
        "single-spa": `https://cdn.jsdelivr.net/npm/single-spa/lib/${this.options.moduleFormat === "esm" ? "esm" : "system"}/single-spa.dev.js`,
        [this.options.appOrParcelName]: mainScriptSrc,
      },
    };

    for (let name in this.options.importMap.imports) {
      importMap.imports[name] = this.options.importMap.imports[name];
    }

    const importMapPrefix =
      this.options.moduleFormat === "esm" ? "injector" : "systemjs";

    const pluginRuntime = this.options.isParcel
      ? this.parcelRuntime()
      : this.applicationRuntime();

    if (this.options.importMapUrl) {
      scripts.push({
        tagName: "script",
        voidTag: false,
        attributes: {
          type: `${importMapPrefix}-importmap`,
          src: this.options.importMapUrl.href,
        },
      });
    }

    if (this.options.importMapUrls) {
      if (!Array.isArray(this.options.importMapUrls)) {
        throw Error(
          `standalone-single-spa-webpack-plugin: importMapUrls option must be an array, if present`,
        );
      }

      this.options.importMapUrls.forEach((importMapUrl) => {
        scripts.push({
          tagName: "script",
          voidTag: false,
          attributes: {
            type: `${importMapPrefix}-importmap`,
            src: importMapUrl.href,
          },
        });
      });
    }

    scripts.push({
      tagName: "script",
      voidTag: false,
      attributes: { type: `${importMapPrefix}-importmap` },
      innerHTML: JSON.stringify(importMap, null, 2),
    });
    scripts.push({
      tagName: "meta",
      voidTag: true,
      attributes: {
        name: "importmap-type",
        content: `${importMapPrefix}-importmap`,
      },
    });
    if (this.options.importMapOverrides) {
      scripts.push({
        tagName: "script",
        voidTag: false,
        attributes: {
          defer: false,
          src: "https://cdn.jsdelivr.net/npm/import-map-overrides/dist/import-map-overrides.js",
        },
      });

      const imoUIAttrs = {
        "dev-libs": true,
      };

      if (this.options.importMapOverridesLocalStorageKey) {
        imoUIAttrs["show-when-local-storage"] =
          this.options.importMapOverridesLocalStorageKey;
      }

      scripts.push({
        tagName: "import-map-overrides-full",
        voidTag: false,
        attributes: imoUIAttrs,
      });
    }
    if (this.options.moduleFormat === "systemjs") {
      scripts.push({
        tagName: "script",
        voidTag: false,
        attributes: {
          defer: false,
          src: "https://cdn.jsdelivr.net/npm/systemjs/dist/system.js",
        },
      });
      scripts.push({
        tagName: "script",
        voidTag: false,
        attributes: {
          defer: false,
          src: "https://cdn.jsdelivr.net/npm/systemjs/dist/extras/amd.js",
        },
      });
    } else {
      scripts.push({
        tagName: "script",
        voidTag: false,
        attributes: {
          defer: false,
          src: "https://cdn.jsdelivr.net/npm/@single-spa/import-map-injector",
        },
      });
    }
    scripts.push({
      tagName: "script",
      voidTag: false,
      innerHTML: pluginRuntime,
    });
  }
  applicationRuntime() {
    return `
      ${this.importMethod}('single-spa').then(function (singleSpa) {
        singleSpa.registerApplication({
          name: '${this.options.appOrParcelName}',
          app: function () {
            return ${this.importMethod}('${this.options.appOrParcelName}');
          },
          activeWhen: ${JSON.stringify(this.options.activeWhen)},
          customProps: ${
            this.options.customProps
              ? JSON.stringify(this.options.customProps)
              : "{}"
          }
        });
        if (!window.location.pathname.startsWith('${
          this.options.activeWhen[0]
        }')) {
          singleSpa.navigateToUrl('${this.options.activeWhen[0]}');
        }
        singleSpa.start(${JSON.stringify(this.options.startOptions)});
      });
    `
      .trim()
      .replace(/\n      /g, "\n");
  }
  parcelRuntime() {
    return `
      Promise.all([${this.importMethod}('single-spa'), ${this.importMethod}('${this.options.appOrParcelName}')]).then(function (values) {
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
        The ${
          this.options.appOrParcelName
        } microfrontend is running in "integrated" mode, since standalone-single-spa-webpack-plugin is disabled. This means that
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
            A yellowish rectangle should appear at the bottom right of your screen. Click on it. Find the name ${
              this.options.appOrParcelName
            }
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
        To run this microfrontend in "standalone" mode, the standalone-single-spa-webpack-plugin must not be disabled. In some cases,
        this is done by running <code>npm run start:standalone</code>. Alternatively, you can add <code>--env standalone</code> to your package.json start script
        if you are using webpack-config-single-spa.
      </p>
        If neither of those work for you, see more details about enabling standalone mode at
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
