import React, { useState, useEffect, FunctionComponent } from 'react';
import { RouteComponentProps } from 'react-router';

import { useCmsState, useEpiserver, useIContentRepository, useServerSideRendering } from '../Hooks/Context';
import { ContentReference, ContentLinkService } from '../Models/ContentLink';
import IContent from '../Models/IContent';
import { IContentRenderer } from './EpiComponent';
import { Spinner } from './Spinner';

export const RoutedComponent: FunctionComponent<RouteComponentProps> = (props: RouteComponentProps) => {
  const epi = useEpiserver();
  const cfg = epi.config();
  const NotFound = cfg.notFoundComponent;
  const repo = useIContentRepository();
  const ssr = useServerSideRendering();
  const path = props.location.pathname;
  const tmpState = useCmsState();
  let ssrData: IContent | null = null;
  if (ssr.IsServerSideRendering) {
    ssrData = tmpState?.iContent ?? ssr.getIContentByPath(path);
  }
  const [iContent, setIContent] = useState<IContent | null>(ssrData);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const debug = epi.isDebugActive();
  const lang = epi.Language;

  const store = epi.getStore();

  // Handle path changes
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    repo
      .getByRoute(path)
      .then((c) => {
        if (isCancelled) return;
        epi.setRoutedContent(c || undefined);
        setIContent(c);
      })
      .finally(() => {
        setIsLoading(false);
      });
    return () => {
      isCancelled = true;
      epi.setRoutedContent();
      setIsLoading(false);
    };
  }, [path, repo, epi]);

  // Handle content changes
  useEffect(() => {
    let isCancelled = false;
    if (!iContent) {
      return () => {
        isCancelled = true;
      };
    }
    const linkId = ContentLinkService.createLanguageId(iContent, lang, true);

    const afterPatch: (link: Readonly<ContentReference>, oldValue: Readonly<IContent>, newValue: IContent) => void = (
      link,
      oldValue,
      newValue,
    ) => {
      setIsLoading(true);
      const itemApiId = ContentLinkService.createLanguageId(link, lang, true);
      if (debug)
        console.debug('RoutedComponent.onContentPatched => Checking content ids (link, received)', linkId, itemApiId);
      if (linkId === itemApiId && !isCancelled) {
        if (debug) console.debug('RoutedComponent.onContentPatched => Updating iContent', itemApiId, newValue);
        setIContent(newValue);
        setIsLoading(false);
      }
    };
    const afterUpdate: (item: IContent | null) => void = (item: IContent | null) => {
      setIsLoading(true);
      if (!item) {
        setIsLoading(false);
        return;
      }
      const itemApiId = ContentLinkService.createLanguageId(item, lang, true);
      if (debug)
        console.debug('RoutedComponent.onContentPatched => Checking content ids (link, received)', linkId, itemApiId);
      if (linkId === itemApiId) {
        if (debug) console.debug('RoutedComponent.onContentUpdated => Updating iContent', itemApiId, item);
        setIContent(item);
        setIsLoading(false);
      }
    };
    repo.addListener('afterPatch', afterPatch);
    repo.addListener('afterUpdate', afterUpdate);

    store.dispatch({
      type: 'OptiContentCloud/SetState',
      iContent: iContent,
    });

    return () => {
      isCancelled = true;
      repo.removeListener('afterPatch', afterPatch);
      repo.removeListener('afterUpdate', afterUpdate);
    };
  }, [repo, debug, lang, iContent]);

  if (iContent === null) {
    if (!isLoading || (ssr.IsServerSideRendering && ssrData === null)) {
      return <NotFound />;
    }

    return <Spinner />;
  }

  return <IContentRenderer data={iContent} path={props.location.pathname} />;
};
RoutedComponent.displayName = 'Optimizely CMS: Path IContent resolver';
export default RoutedComponent;
