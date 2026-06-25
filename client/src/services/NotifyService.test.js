import NotifyService, { NotifyType } from './NotifyService';

vi.mock('./LoggerService', () => ({
  default: { info: vi.fn() },
}));

describe('NotifyService', () => {
  let received = [];
  let unsubscribe;

  beforeEach(() => {
    received = [];
    unsubscribe = NotifyService.subscribe(n => received.push(n));
  });
  afterEach(() => unsubscribe());

  test('subscribe listener receives emitted notifications', () => {
    NotifyService.show('Hello', NotifyType.INFO);
    expect(received).toHaveLength(1);
    expect(received[0].message).toBe('Hello');
    expect(received[0].type).toBe(NotifyType.INFO);
  });

  test('unsubscribe stops receiving notifications', () => {
    unsubscribe();
    NotifyService.show('After unsub', NotifyType.INFO);
    expect(received).toHaveLength(0);
    unsubscribe = () => {}; // prevent double-unsubscribe in afterEach
  });

  test('success() emits a success-type notification', () => {
    NotifyService.success('Great job');
    expect(received[0].type).toBe(NotifyType.SUCCESS);
    expect(received[0].message).toBe('Great job');
  });

  test('error() emits a danger-type notification', () => {
    NotifyService.error('Something broke');
    expect(received[0].type).toBe(NotifyType.ERROR);
  });

  test('warning() emits a warning-type notification', () => {
    NotifyService.warning('Heads up');
    expect(received[0].type).toBe(NotifyType.WARNING);
  });

  test('every notification has a numeric id field', () => {
    NotifyService.show('msg1', NotifyType.INFO);
    NotifyService.show('msg2', NotifyType.INFO);
    expect(received).toHaveLength(2);
    received.forEach(n => expect(typeof n.id).toBe('number'));
  });

  test('every notification includes a duration field', () => {
    NotifyService.info('check duration');
    expect(received[0].duration).toBeGreaterThan(0);
  });

  test('multiple subscribers all receive the same notification', () => {
    const received2 = [];
    const unsub2 = NotifyService.subscribe(n => received2.push(n));
    NotifyService.show('broadcast', NotifyType.INFO);
    expect(received).toHaveLength(1);
    expect(received2).toHaveLength(1);
    unsub2();
  });
});
