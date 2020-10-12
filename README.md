# standalone-single-spa-webpack-plugin

A webpack plugin for running single-spa microfrontends in standalone mode. This is an alternative to using [import-map-overrides](https://github.com/joeldenning/import-map-overrides).

_Running in standalone mode is not 100% equivalent to when it's fully integrated into the rest of the app. For this reason, using import-map-overrides on an integrated environment is generally recommended._

## Installation

```sh
npm install --save-dev standalone-single-spa-webpack-plugin

# alternatively
yarn add --dev standalone-single-spa-webpack-plugin
```

## Usage

To use the plugin, add it to your webpack config. Then when you run webpack-dev-server, an HTML file will be generated that loads and mounts your microfrontend as a single-spa application or parcel.

```js
// webpack.config.js
const StandaloneSingleSpaPlugin = require('standalone-signle-spa-webpack-plugin');
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

      // optional - strongly encouraged for single-spa applications
      activeWhen: ['/route-prefix'],

      // optional - useful for enabling cross-microfrontend imports
      importMapUrl: new URL("https://my-cdn.com/importmap.json"),

      // optional - useful for adding an additional, local-only import map
      importMap: {
        imports: {
          "other-module": "/other-module.js"
        }
      },

      // optional - defaults to false. This determines whether to mount
      // your microfrontend as an application or a parcel
      isParcel: false

      // optional - you can disable the plugin by passing in this boolean
      disabled: false

      // optional - the standalone plugin relies on optionalDependencies in the
      // package.json. If this doesn't work for you, pass in your HtmlWebpackPlugin
      // to ensure the correct one is being referenced
      HtmlWebpackPlugin
    })
  ]
}
```

Now when you run `npm start` or `npm run serve`, you can view your code running on localhost, without setting up an import map override.

## Customizing the HTML File

You may customize the HTML file used by the standalone plugin by creating a `src/index.ejs` file. The standalone plugin injects its scripts at the end of the `<body>` of that file. This is done via [html-webpack-plugin](https://github.com/jantimon/html-webpack-plugin), which has a [template option](https://github.com/jantimon/html-webpack-plugin#options) that allows you to control the HTML template.

## Notes

This plugin (currently) assumes that you are using SystemJS to load your microfrontends. If you are not using SystemJS and would like to use this plugin, please file a Github issue.
