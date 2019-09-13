export interface Destructible {
  destroy(): void;
}

export interface DestructibleResource<TResource extends object> extends Destructible {
  object: TResource;
}
