import Axios, { AxiosRequestConfig, Method, AxiosResponse, AxiosAdapter, AxiosPromise, AxiosError } from 'axios';
import AppConfig from './AppConfig';
import IContent from './Models/IContent';
import ContentLink, { ContentReference, ContentLinkService } from './Models/ContentLink';
import ActionResponse, { ResponseType } from './Models/ActionResponse';
import WebsiteList from './Models/WebsiteList';
import Website from './Models/Website';
import PathProvider from './PathProvider';
import Property from './Property';

export type PathResponse<T = any, C extends IContent = IContent> = C | ActionResponse<T, C>;

export type NetworkErrorData<T = any> = IContent & {
  error: Property<T>;
};

export function PathResponseIsIContent(iContent: PathResponse): iContent is IContent {
  if ((iContent as ActionResponse<any>).actionName) {
    return false;
  }
  return true;
}
export function PathResponseIsActionResponse<P extends any = any>(
  actionResponse: PathResponse,
): actionResponse is ActionResponse<P> {
  if ((actionResponse as ActionResponse<P>).actionName) {
    return true;
  }
  return false;
}
export function getIContentFromPathResponse<IContentType extends IContent = IContent>(
  response: PathResponse<any, IContentType>,
): IContentType | null {
  if (PathResponseIsActionResponse(response)) {
    return response.currentContent;
  }
  if (PathResponseIsIContent(response)) {
    return response;
  }
  return null;
}

/**
 * ContentDelivery API Wrapper
 *
 * @deprecated
 */
export class ContentDeliveryAPI {
  protected config: AppConfig;
  protected componentService = '/api/episerver/v3.0/content/';
  protected websiteService = '/api/episerver/v3/site/';
  protected methodService = '/api/episerver/v3/action/';
  protected debug = false;
  protected pathProvider: PathProvider;

  /**
   * Marker to keep if we're in edit mode
   */
  protected inEditMode = false;

  /**
   * Internal cache of the websites retrieved from the ContentDelivery API
   *
   * @private
   */
  private websites!: WebsiteList;

  /**
   * Internal cache of the current website, as retrieved from the ContentDelivery API
   *
   * @private
   */
  private website!: Website;

  /**
   * ContentDelivery API Wrapper
   *
   * @deprecated
   */
  constructor(pathProvider: PathProvider, config: AppConfig) {
    this.pathProvider = pathProvider;
    this.config = config;
    this.debug = this.config.enableDebug === true;
  }

  public get currentPathProvider(): PathProvider {
    return this.pathProvider;
  }

  public get currentConfig(): AppConfig {
    return this.config;
  }

  public isInEditMode(): boolean {
    return this.inEditMode;
  }

  public setInEditMode(editMode: boolean): ContentDeliveryAPI {
    this.inEditMode = editMode === true;
    return this;
  }

  public isDisabled(): boolean {
    return this.config.noAjax === true;
  }

  /**
   * Invoke an ASP.Net MVC controller method using the generic content API. This is intended
   * to be used only when attaching a SPA to an existing code-base.
   *
   * @param content The content for which the controller must be loaded
   * @param method  The (case sensitive) method name to invoke on the controller
   * @param verb    The HTTP verb to use when invoking the controller
   * @param data    The data (if any) to send to the controller for the method
   */
  public async invokeControllerMethod(
    content: ContentLink,
    method: string,
    verb?: Method,
    data?: object,
  ): Promise<any> {
    const options = this.getRequestSettings(verb);
    options.data = data;
    return await this.doRequest<any>(this.getMethodServiceUrl(content, method), options);
  }

  /**
   * Strongly typed variant of invokeControllerMethod
   *
   * @see   invokeControllerMethod()
   * @param content The content for which the controller must be loaded
   * @param method  The (case sensitive) method name to invoke on the controller
   * @param verb    The HTTP verb to use when invoking the controller
   * @param data    The data (if any) to send to the controller for the method
   */
  public async invokeTypedControllerMethod<TypeOut, TypeIn>(
    content: ContentLink,
    method: string,
    verb?: Method,
    data?: TypeIn,
  ): Promise<ActionResponse<TypeOut>> {
    const options = this.getRequestSettings(verb);
    options.data = data;
    return await this.doRequest<ActionResponse<TypeOut>>(this.getMethodServiceUrl(content, method), options);
  }

  /**
   * Retrieve a list of all websites registered within Episerver
   */
  public async getWebsites(): Promise<WebsiteList> {
    if (!this.websites) {
      this.websites = await this.doRequest<WebsiteList>(this.config.epiBaseUrl + this.websiteService);
    }
    return this.websites;
  }

  /**
   * Retrieve the first website registered within Episerver
   */
  public async getWebsite(): Promise<Website> {
    const list = await this.getWebsites();
    return list[0];
  }

  public async getContent(content: ContentLink, forceGuid = false): Promise<IContent | null> {
    if (!(content && (content.guidValue || content.url))) {
      if (this.config.enableDebug) {
        console.warn('Loading content for an empty reference ', content);
      }
      return null;
    }
    const useGuid = content.guidValue ? this.config.preferGuid || forceGuid : false;
    let serviceUrl: URL;
    if (useGuid) {
      serviceUrl = new URL(this.config.epiBaseUrl + this.componentService + content.guidValue);
    } else {
      try {
        serviceUrl = new URL(
          this.config.epiBaseUrl +
            (content.url ? content.url : this.componentService + ContentLinkService.createApiId(content)),
        );
      } catch (e) {
        serviceUrl = new URL(this.config.epiBaseUrl + this.componentService + ContentLinkService.createApiId(content));
      }
    }
    //serviceUrl.searchParams.append('currentPageUrl', this.pathProvider.getCurrentPath());
    if (this.config.autoExpandRequests) {
      serviceUrl.searchParams.append('expand', '*');
    }
    return this.doRequest<PathResponse>(serviceUrl.href)
      .catch((r) => {
        
        return this.buildNetworkError(r);
      })
      .then((r) => getIContentFromPathResponse(r));
  }

  public async getContentsByRefs(refs: Array<string>): Promise<Array<IContent>> {
    if (!refs || refs.length == 0) {
      return Promise.resolve<Array<IContent>>([]);
    }
    const serviceUrl: URL = new URL(this.config.epiBaseUrl + this.componentService);
    serviceUrl.searchParams.append('references', refs.join(','));
    if (this.config.autoExpandRequests) {
      serviceUrl.searchParams.append('expand', '*');
    }
    return this.doRequest<Array<IContent>>(serviceUrl.href).catch((r) => {
      return [];
    });
  }

  public async getContentByRef(ref: string): Promise<IContent> {
    const serviceUrl: URL = new URL(this.config.epiBaseUrl + this.componentService + ref);
    if (this.config.autoExpandRequests) {
      serviceUrl.searchParams.append('expand', '*');
    }
    return this.doRequest<IContent>(serviceUrl.href).catch((r) => {
      return this.buildNetworkError(r);
    });
  }

  public async getContentByPath(path: string): Promise<PathResponse> {
    const serviceUrl: URL = new URL(this.config.epiBaseUrl + path);
    if (this.config.autoExpandRequests) {
      serviceUrl.searchParams.append('expand', '*');
    }
    //serviceUrl.searchParams.append('currentPageUrl', this.pathProvider.getCurrentPath());
    return this.doRequest<PathResponse>(serviceUrl.href).catch((r) => {
      return this.buildNetworkError(r, path);
    });
  }

  public async getContentChildren<T extends IContent>(id: ContentReference): Promise<Array<T>> {
    const itemId: string = ContentLinkService.createApiId(id);
    const serviceUrl: URL = new URL(this.config.epiBaseUrl + this.componentService + itemId + '/children');
    if (this.config.autoExpandRequests) {
      serviceUrl.searchParams.append('expand', '*');
    }
    return this.doRequest<Array<T>>(serviceUrl.href).catch((r) => {
      return [];
    });
  }

  public async getContentAncestors(link: ContentReference): Promise<Array<IContent>> {
    const itemId: string = ContentLinkService.createApiId(link);
    const serviceUrl: URL = new URL(`${this.config.epiBaseUrl}${this.componentService}${itemId}/ancestors`);
    if (this.config.autoExpandRequests) {
      serviceUrl.searchParams.append('expand', '*');
    }
    return this.doRequest<Array<IContent>>(serviceUrl.href).catch((r) => {
      return [];
    });
  }

  /**
   * Perform the actual request
   *
   * @param url The URL to request the data from
   * @param options The Request options to use
   */
  protected async doRequest<T>(url: string, options?: AxiosRequestConfig): Promise<T> {
    if (this.isDisabled()) {
      return Promise.reject('The Content Delivery API has been disabled');
    }
    if (this.isInEditMode()) {
      const urlObj = new URL(url);
      urlObj.searchParams.append('epieditmode', 'True');
      //Add channel...
      //Add project...
      urlObj.searchParams.append('preventCache', Math.round(Math.random() * 100000000).toString());
      url = urlObj.href;
    }

    options = options ? options : this.getRequestSettings();
    if (this.debug) console.debug('Requesting: ' + url);
    options.url = url;
    return Axios.request<any, AxiosResponse<T>>(options)
      .then((response) => {
        if (this.debug) console.debug(`Response from ${url}:`, response.data);
        return response.data;
      })
      .catch((reason: Error | AxiosError) => {
        if (this.debug) console.error(`Response from ${url}: HTTP Fetch error `, reason);
        throw reason;
      });
  }

  protected getMethodServiceUrl(content: ContentLink, method: string): string {
    let contentUrl: string = this.config.epiBaseUrl;
    contentUrl = contentUrl + this.methodService;
    contentUrl = contentUrl + content.guidValue + '/' + method;
    return contentUrl;
  }

  /**
   * Build the request parameters needed to perform the call to the Content Delivery API
   *
   * @param verb The verb for the generated configuration
   */
  protected getRequestSettings(verb?: Method): AxiosRequestConfig {
    const options: AxiosRequestConfig = {
      method: verb ? verb : 'get',
      baseURL: this.config.epiBaseUrl,
      withCredentials: true,
      headers: { ...this.getHeaders() },
      transformRequest: [
        (data: any, headers: any) => {
          if (data) {
            headers['Content-Type'] = 'application/json';
            return JSON.stringify(data);
          }
          return data;
        },
      ],
      responseType: 'json',
    };
    if (this.config.networkAdapter) {
      options.adapter = this.config.networkAdapter;
    }
    return options;
  }

  protected getHeaders(customHeaders?: object): object {
    const defaultHeaders = {
      Accept: 'application/json',
      'Accept-Language': this.config.defaultLanguage, //@ToDo: Convert to context call, with default
    };
    if (!customHeaders) return defaultHeaders;

    return {
      ...defaultHeaders,
      ...customHeaders,
    };
  }

  public static IsActionResponse(response: PathResponse): response is ActionResponse<any> {
    if (
      response &&
      (response as ActionResponse<any>).responseType &&
      (response as ActionResponse<any>).responseType == ResponseType.ActionResult
    ) {
      return true;
    }
    return false;
  }

  private counter = 0;

  protected buildNetworkError(reason: any, path = ''): NetworkErrorData {
    const errorId = ++this.counter;
    return {
      name: {
        propertyDataType: 'String',
        value: 'Error',
      },
      contentType: ['Errors', 'NetworkError'],
      contentLink: {
        guidValue: '',
        id: errorId,
        providerName: 'ContentDeliveryAPI_Errors',
        url: path,
        workId: 0,
      },
      error: {
        propertyDataType: 'Unknown',
        value: '', //reason,
      },
    };
  }
}

export default ContentDeliveryAPI;
