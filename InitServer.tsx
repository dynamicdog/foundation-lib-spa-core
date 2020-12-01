// Set SSR
import getGlobal from './AppGlobal';
const ctx = getGlobal();
ctx.epi = ctx.epi || {};
ctx.epi.isServerSideRendering = true;

// Global Libraries && Poly-fills
import ReactDOMServer from 'react-dom/server';
import { Helmet } from 'react-helmet';
import React from 'react';

// Episerver Libraries
import IServiceContainer from './Core/IServiceContainer';
import DefaultServiceContainer from './Core/DefaultServiceContainer'; 
import EpiSpaContext from './Spa';
import CmsSite from './Components/CmsSite';
import AppConfig from './AppConfig';

// Episerver SPA/PWA Server Side Rendering libs
import SSRResponse from './ServerSideRendering/Response';

export default function RenderServerSide(config: AppConfig, serviceContainer?: IServiceContainer): SSRResponse {
    // Initialize Episerver Context, for Server Side Rendering
    // EpiContext.Instance = new SSRContext(new SSRPathProvider());
    serviceContainer = serviceContainer || new DefaultServiceContainer();
    config.enableSpinner = false;
    config.noAjax = true;
    config.enableDebug = true;
    EpiSpaContext.init(config, serviceContainer, true);

    const body = ReactDOMServer.renderToString(<CmsSite context={EpiSpaContext}/>);
    const meta = Helmet.renderStatic();

    return {
        Body: body,
        HtmlAttributes: meta.htmlAttributes.toString(),
        Title: meta.title.toString(),
        Meta: meta.meta.toString(),
        Link: meta.link.toString(),
        Script: meta.script.toString(),
        Style: meta.style.toString(),
        BodyAttributes: meta.bodyAttributes.toString()
    };
}