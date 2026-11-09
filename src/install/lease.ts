// One MIDI owner across all tabs on this origin; held through session restarts.
export async function acquireMidiLease(manager: LockManager | undefined = globalThis.navigator?.locks): Promise<() => void> {
  if (!manager) throw new Error('이 브라우저는 탭 간 MIDI 잠금을 지원하지 않습니다. 최신 Chrome/Edge를 사용하세요.');
  return new Promise((resolve, reject) => {
    void manager.request('smk37-drawer-midi', {mode:'exclusive', ifAvailable:true}, async lock => {
      if (!lock) throw new Error('다른 서랍 탭이 MIDI를 사용 중입니다. 그 탭에서 연결을 해제하거나 닫으세요.');
      await new Promise<void>(release => resolve(release));
    }).catch(reject);
  });
}
