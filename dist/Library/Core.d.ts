import { Action, AnyAction } from '@reduxjs/toolkit';
import AppConfig from '../AppConfig';
import IServiceContainerBase, { DefaultServices as DefaultServicesBase } from '../Core/IServiceContainer';
import DefaultServiceContainerBase from '../Core/DefaultServiceContainer';
import IEpiserverContextBase from '../Core/IEpiserverContext';
import DefaultEventEngineBase from '../Core/DefaultEventEngine';
import IEventEngineBase from '../Core/IEventEngine';
import IInitializableModuleBase, { BaseInitializableModule as CoreBaseInitializableModule } from '../Core/IInitializableModule';
import IStateReducerInfoBase from '../Core/IStateReducerInfo';
export declare const DefaultEventEngine: typeof DefaultEventEngineBase;
export declare const DefaultServiceContainer: typeof DefaultServiceContainerBase;
export declare const DefaultContext: IEpiserverContextBase;
export declare const DefaultServices: typeof DefaultServicesBase;
export declare const BaseInitializableModule: typeof CoreBaseInitializableModule;
export type IEpiserverContext = IEpiserverContextBase;
export type IEventEngine = IEventEngineBase;
export type IInitializableModule = IInitializableModuleBase;
export type IServiceContainer = IServiceContainerBase;
export type IStateReducerInfo<S, A extends Action = AnyAction> = IStateReducerInfoBase<S, A>;
export type IConfig = AppConfig;
