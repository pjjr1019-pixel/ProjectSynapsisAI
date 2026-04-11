type IpcChannelMap = Record<string, string | undefined>;

export type IpcInvokeHandler = (...args: unknown[]) => unknown;

interface CreateValidatedIpcHandleRegistryOptions<TChannels extends IpcChannelMap> {
  channelMap: TChannels;
  registerHandle: (channel: string, handler: IpcInvokeHandler) => void;
}

export interface ValidatedIpcHandleRegistry<TChannels extends IpcChannelMap> {
  register<TKey extends keyof TChannels & string>(channelKey: TKey, handler: IpcInvokeHandler): void;
  reset(): void;
}

export const createValidatedIpcHandleRegistry = <TChannels extends IpcChannelMap>(
  options: CreateValidatedIpcHandleRegistryOptions<TChannels>
): ValidatedIpcHandleRegistry<TChannels> => {
  const registeredChannels = new Set<string>();

  const resolveChannel = (channelKey: keyof TChannels & string): string => {
    const channel = options.channelMap[channelKey];
    if (typeof channel !== "string" || channel.trim().length === 0) {
      throw new Error(`Missing IPC channel constant: ${channelKey}`);
    }
    return channel;
  };

  return {
    register(channelKey, handler) {
      const channel = resolveChannel(channelKey);
      if (registeredChannels.has(channel)) {
        throw new Error(`Duplicate IPC channel registration: ${channel}`);
      }
      registeredChannels.add(channel);
      options.registerHandle(channel, handler);
    },
    reset() {
      registeredChannels.clear();
    }
  };
};
