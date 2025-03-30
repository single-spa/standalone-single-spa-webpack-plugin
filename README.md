# standalone-single-spa-webpack-plugin

A webpack plugin for running single-spa microfrontends in standalone mode. This is an alternative to using [import-map-overrides](https://github.com/joeldenning/import-map-overrides).

> **⚠️ Warning about Standalone Mode**
>
> Standalone mode is not equivalent to developing in integrated mode, as the single-spa root config is not exactly the same in each.
>
> - Since the root config in standalone mode is not exactly the same as in integrated mode, this can lead to situations where it "works on my machine, but not on the deployed environment."
> - This plugin automatically upgrades to the latest versions of SystemJS and single-spa, which is likely different than most environments, which pin to a specific version.
> - If a hard coded import map is used in this plugin's configuration, it may quickly become outdated. This may lead to developing locally against a package whose API has changed.
> - By default, this plugin does not load any global scripts, fonts, or css in the HTML file.

## Installation

```sh
npm install --save-dev standalone-single-spa-webpack-plugin

# alternatively
yarn add --dev standalone-single-spa-webpack-plugin

pnpm install --dev standalone-single-spa-webpack-plugin
```

## Usage

To use the plugin, add it to your webpack config. Then when you run webpack-dev-server, an HTML file will be generated that loads and mounts your microfrontend as a single-spa application or parcel.

```js
// webpack.config.js
const StandaloneSingleSpaPlugin = require('standalone-single-spa-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  devServer: {
    // Not required, but it's often useful to run webpack-dev-server in SPA mode
    historyApiFallback: true
  },
  plugins: [
    // the standalone plugin works in conjunction with HtmlWebpackPlugin
    new HtmlWebpackPlugin(),

    new StandaloneSingleSpaPlugin({
      // required
      appOrParcelName: "my-microfrontend-name",

      // optional - either "esm" or "systemjs", defaults to esm as of v6
      moduleFormat: "esm",

      // optional - strongly encouraged for single-spa applications
      activeWhen: ['/route-prefix'],

      // optional - useful for enabling cross-microfrontend imports
      importMapUrl: new URL("https://my-cdn.com/importmap.json"),

      // optional - useful to add multiple import map URLs
      importMapUrls: [
        new URL("https://my-cdn.com/importmap2.json"),
        new URL("https://my-cdn.com/importmap3.json"),
      ],

      // optional - useful for adding an additional, local-only import map
      importMap: {
        imports: {
          "other-module": "/other-module.js"
        }
      },

      // optional - defaults to false. This determines whether to mount
      // your microfrontend as an application or a parcel
      isParcel: false,

      // optional - you can disable the plugin by passing in this boolean
      disabled: false,

      // optional - the standalone plugin relies on optionalDependencies in the
      // package.json. If this doesn't work for you, pass in your HtmlWebpackPlugin
      // to ensure the correct one is being referenced
      HtmlWebpackPlugin,

      // optional - defaults to true - turns on or off import-map-overrides.
      importMapOverrides: true,

      // optional - defaults to null. This allows you to hide the import-map-overrides UI
      // unless a local storage key is set. See more info at https://github.com/joeldenning/import-map-overrides/blob/master/docs/ui.md#enabling-the-ui
      importMapOverridesLocalStorageKey: null

      // optional - defaults to {}. The single-spa custom props passed to the application
      // Note that these props are stringified into the HTML file
      customProps: {
        authToken: "sadf7889fds8u70df9s8fsd"
      },

      // optional - defaults to turning urlRerouteOnly on
      // The options object passed into single-spa's start() function.
      // See https://single-spa.js.org/docs/api#start
      startOptions: {
        urlRerouteOnly: true
      }
    })
  ]
}
```

Now when you run `npm start` or `npm run serve`, you can view your code running on localhost, without setting up an import map override.

## Customizing the HTML File

You may customize the HTML file used by the standalone plugin by creating a `src/index.ejs` file. The standalone plugin injects its scripts at the end of the `<body>` of that file. This is done via [html-webpack-plugin](https://github.com/jantimon/html-webpack-plugin), which has a [template option](https://github.com/jantimon/html-webpack-plugin#options) that allows you to control the HTML template.

## Notes

This plugin (currently) assumes that you are using SystemJS to load your microfrontends. If you are not using SystemJS and would like to use this plugin, please file a Github issue.
