import IInitializableModule, { BaseInitializableModule } from '../Core/IInitializableModule'
import IServiceContainer, { DefaultServices } from '../Core/IServiceContainer';
import ComponentLoader, { isIComponentLoader } from './ComponentLoader';
import AppConfig from '../AppConfig';
import BaseTypeMapper from './BaseTypeMapper';

export default class LoadersModule extends BaseInitializableModule implements IInitializableModule
{
    /**
     * The relative sequence number of the module
     */
    public readonly SortOrder = 30;

    /**
     * The name of the module, as reported by the SPA
     * 
     * @var { string }
     */
    protected name : string = "Episerver Type & Component Loaders";

    /**
     * Ensure the configuration object within the service container contains a "*" route. If
     * this "*" route is not claimed by the implementation, it will be added as fall-back to
     * Episerver CMS based routing.
     * 
     * @param {IServiceContainer} container The Service Container to update
     */
    public ConfigureContainer(container: IServiceContainer) : void
    {
        // Get Application Config
        const config = container.getService<AppConfig>(DefaultServices.Config);

        // Register loaders
        this.addComponentLoaderToContainer(container, config);        
        this.addTypeMapperToContainer(container, config);
    }

    private addTypeMapperToContainer(container: IServiceContainer, config: AppConfig) : void
    {
      if (config.typeMapper) {
        const tm : BaseTypeMapper = new config.typeMapper();
        container.addService(DefaultServices.TypeMapper, tm);
      }
    }

    private addComponentLoaderToContainer(container: IServiceContainer, config: AppConfig) : void
    {
        const cl = new ComponentLoader();
        cl.setDebug(config.enableDebug || false);
        if (config.componentLoaders) {
          config.componentLoaders.forEach(loader => {
            if (isIComponentLoader(loader)) {
              loader.setDebug(config.componentLoaders?.debug || config.enableDebug || false);
              cl.addLoader(loader);
            } else {
              const loaderInstance = cl.createLoader(loader, true);
              loaderInstance.setDebug(config.componentLoaders?.debug || config.enableDebug || false);
            }
          })
        }
        container.addService(DefaultServices.ComponentLoader, cl);
    }
}