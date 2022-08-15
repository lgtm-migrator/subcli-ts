import { ApiPromise, WsProvider } from '@polkadot/api';
// import { prettyBalance } from './utils/prettyBalance';
import '@polkadot/api-augment';
// import { Keyring } from '@polkadot/keyring';
import { u8aToHex } from '@polkadot/util';

const WEB_SOCKET = 'wss://bifrost-rpc.liebi.com/ws';
// const ALICE = '//Alice';
// const BOB = '//Bob';

// const sleep = (ms: number) => {
//   return new Promise(resolve => setTimeout(resolve, ms));
// };

const connectSubstrate = async () => {
  const wsProvider = new WsProvider(WEB_SOCKET);
  const api = await ApiPromise.create({ provider: wsProvider, types: {} });
  await api.isReady;
  console.log(`Connected to substrate node: ${WEB_SOCKET}`);
  return api;
};

// 读取某个模块 (pallet) 的常量
// api.consts.<pallet 名称>.<常量名称>
// const getConst = async (api: ApiPromise) => {
//   const existentialDeposit = await api.consts.balances.existentialDeposit;
//   return prettyBalance(existentialDeposit);
// };

// 读取 balance 模块的存储内容
// api.query.<pallet 名称>.<存储名称>
// const getFreeBalance = async (api: ApiPromise, address: string) => {
//   const keyring = new Keyring({ type: 'sr25519' });
//   const account = keyring.addFromUri(address);
//   const acc = await api.query.system.account(account.address);
//   return prettyBalance(acc.data.free);
// };

// const getStakingAmount =  async (api: ApiPromise, address: string) => {
//   const acc = await api.query.parachainStaking.topDelegations(address);
//   return acc;
// };

// const transferBalance = async (api: ApiPromise, from: string, to: string, amount: number) => {
//   const keyring = new Keyring({ type: 'sr25519' });
//   const fromAccount = keyring.addFromUri(from);
//   const toAccount = keyring.addFromUri(to);
//   await api.tx.balances.transfer(toAccount.address, amount).signAndSend(fromAccount, res => {
//     console.log(`transfer from: ${from} to: ${to} status: ${res.status}`);
//   });
// };

// 订阅事件
// const subscribeBalance = async (api: ApiPromise, address: string) => {
//   const keyring = new Keyring({ type: 'sr25519' });
//   const account = keyring.addFromUri(address);
//   return await api.query.system.account(account.address, acc => {
//     const free = acc.data.free;
//     console.log(`${address} Account subscribed balance: ${prettyBalance(free)}`);
//   })
// };

// subscribe events
// const subscribeEvents = async (api: ApiPromise) => {
//   return await api.query.system.events(events => {
//     events.forEach(function (event) {
//       // filter according to index, pallet id and event id.
//       // for template and something, 8 and 0
//       console.log(event.event.index);
//       // first data is new value for something, second value is account id.
//       console.log(event.event.data);
//     })
//   });
// };

const main = async () => {
  const api = await connectSubstrate();

  const collators = await api.query.parachainStaking.candidatePool();
  // console.log(collators.toString());
  const parsedJson = JSON.parse(collators.toString());

  let collatorList: string[] = [];
  for (const i in parsedJson) {
    collatorList.push(parsedJson[i].owner);
    //console.log(parsedJson[i].owner);
  }
  console.log(collatorList);
  collatorList = ['bjxqH1KsiSxkHtWFHqHoWkyodDMbbEQWWbepHUcFEKe2iFQ', 'c62WA2bTtTTBRqojCF1NQqV7pTGLXvzvryRCxXmDujmXCmm'];

  const delegatorMap = new Map();
  for (const i in collatorList) {
    const delegations = await api.query.parachainStaking.topDelegations(collatorList[i]);
    const parsedJson = JSON.parse(delegations.toString());
    // console.log(parsedJson);
    for (const j in  parsedJson.delegations) {
      delegatorMap.set(parsedJson.delegations[j].owner, true);
    }
  }
  // console.log(delegatorMap);
  let delegatorList: string[] = [];
  delegatorList = Array.from( delegatorMap.keys() )
  console.log('collator length:', collatorList.length);
  console.log('delegator length:', delegatorList.length);

  const res = api.tx.parachainStaking.hotfixMigrateCollatorsFromReserveToLocks(collatorList);
  const u8a = res.method.toU8a();
  const hex = u8aToHex(u8a);
  console.log("# collator count:", collatorList.length);
  console.log(hex);
  console.log();

  const chunkSize = 50;
  let cnt = 1;
  for (let i = 0; i < delegatorList.length; i += chunkSize) {
    const chunk = delegatorList.slice(i, i+chunkSize);
    console.log("# delegator", cnt++, "count", chunk.length);
    const res = api.tx.parachainStaking.hotfixMigrateDelegatorsFromReserveToLocks(chunk);
    const u8a = res.method.toU8a();
    const hex = u8aToHex(u8a);
    console.log(hex);
    console.log();
  }

  // const val = await getStakingAmount(api, "cgDuzZHFuMiStTqqZdSsXLpfRGX7GCUQzE3ostwohec18RR");
  // console.log(val);

  // console.log("const value existentialDeposit is: ", await getConst(api));

  // console.log("init alice balance is: ", await getFreeBalance(api, ALICE));
  // console.log("init bob balance is: ", await getFreeBalance(api, BOB));

  // transferBalance(api, ALICE, BOB, 10 ** 12);
  // await sleep(5000);

  // console.log("after alice balance is: ", await getFreeBalance(api, ALICE));
  // console.log("after bob balance is: ", await getFreeBalance(api, BOB));

  // const unsubEvents = await subscribeEvents(api);
  // const unsubAlice = await subscribeBalance(api, ALICE);
  // const unsubBob = await subscribeBalance(api, BOB);

  // await sleep(1000);
  // transferBalance(api, ALICE, BOB, 10 ** 12);
  // await sleep(15000);

  // unsubAlice();
  // unsubBob();
  // unsubEvents();

  // 获取链上 meta-data
  // const metadata = await api.rpc.state.getMetadata();
  // console.log(`Chain Metadata: ${JSON.stringify(metadata, null, 2)}`);
};

main()
  .then(() => {
    console.log("successfully exited");
    process.exit(0);
  })
  .catch(err => {
    console.log('error occur:', err);
    process.exit(1);
  })
