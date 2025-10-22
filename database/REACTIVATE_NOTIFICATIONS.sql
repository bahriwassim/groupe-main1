D:\telechargements final\groupe-main\groupe-main\node_modules\@supabase\supabase-js\dist\module\lib\fetch.js:23   POST https://lcyevhpexzcrmbfozqwt.supabase.co/rest/v1/orders?select=* 400 (Bad Request)
eval @ D:\telechargements final\groupe-main\groupe-main\node_modules\@supabase\supabase-js\dist\module\lib\fetch.js:23
eval @ D:\telechargements final\groupe-main\groupe-main\node_modules\@supabase\supabase-js\dist\module\lib\fetch.js:44
fulfilled @ D:\telechargements final\groupe-main\groupe-main\node_modules\@supabase\supabase-js\dist\module\lib\fetch.js:4
Promise.then
step @ D:\telechargements final\groupe-main\groupe-main\node_modules\@supabase\supabase-js\dist\module\lib\fetch.js:6
eval @ D:\telechargements final\groupe-main\groupe-main\node_modules\@supabase\supabase-js\dist\module\lib\fetch.js:7
__awaiter @ D:\telechargements final\groupe-main\groupe-main\node_modules\@supabase\supabase-js\dist\module\lib\fetch.js:3
eval @ D:\telechargements final\groupe-main\groupe-main\node_modules\@supabase\supabase-js\dist\module\lib\fetch.js:34
then @ D:\telechargements final\groupe-main\groupe-main\node_modules\@supabase\postgrest-js\dist\cjs\PostgrestBuilder.js:66
D:\telechargements final\groupe-main\groupe-main\src\lib\supabase-service.ts:721  🚨 ÉCHEC CRÉATION COMMANDE: {code: 'PGRST204', message: "Could not find the 'delivery_location' column of 'orders' in the schema cache", details: null, hint: null, données_envoyées: {…}}
error @ D:\src\client\components\globals\intercept-console-error.ts:40
createOrder @ D:\telechargements final\groupe-main\groupe-main\src\lib\supabase-service.ts:721
await in createOrder
onSubmit @ D:\telechargements final\groupe-main\groupe-main\src\app\orders\new\order-form.tsx:280
eval @ D:\telechargements final\groupe-main\groupe-main\node_modules\react-hook-form\dist\index.esm.mjs:2301
await in eval
executeDispatch @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:16501
runWithFiberInDEV @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:844
processDispatchQueue @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:16551
eval @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:17149
batchedUpdates$1 @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:3262
dispatchEventForPluginEventSystem @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:16705
dispatchEvent @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:20815
dispatchDiscreteEvent @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:20783
D:\telechargements final\groupe-main\groupe-main\src\lib\supabase-service.ts:761  ❌❌❌ ERREUR lors de la création de la commande: {code: 'PGRST204', details: null, hint: null, message: "Could not find the 'delivery_location' column of 'orders' in the schema cache"}
error @ D:\src\client\components\globals\intercept-console-error.ts:40
createOrder @ D:\telechargements final\groupe-main\groupe-main\src\lib\supabase-service.ts:761
await in createOrder
onSubmit @ D:\telechargements final\groupe-main\groupe-main\src\app\orders\new\order-form.tsx:280
eval @ D:\telechargements final\groupe-main\groupe-main\node_modules\react-hook-form\dist\index.esm.mjs:2301
await in eval
executeDispatch @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:16501
runWithFiberInDEV @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:844
processDispatchQueue @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:16551
eval @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:17149
batchedUpdates$1 @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:3262
dispatchEventForPluginEventSystem @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:16705
dispatchEvent @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:20815
dispatchDiscreteEvent @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:20783
D:\telechargements final\groupe-main\groupe-main\src\lib\supabase-service.ts:762  Message: Could not find the 'delivery_location' column of 'orders' in the schema cache
error @ D:\src\client\components\globals\intercept-console-error.ts:40
createOrder @ D:\telechargements final\groupe-main\groupe-main\src\lib\supabase-service.ts:762
await in createOrder
onSubmit @ D:\telechargements final\groupe-main\groupe-main\src\app\orders\new\order-form.tsx:280
eval @ D:\telechargements final\groupe-main\groupe-main\node_modules\react-hook-form\dist\index.esm.mjs:2301
await in eval
executeDispatch @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:16501
runWithFiberInDEV @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:844
processDispatchQueue @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:16551
eval @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:17149
batchedUpdates$1 @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:3262
dispatchEventForPluginEventSystem @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:16705
dispatchEvent @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:20815
dispatchDiscreteEvent @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:20783
D:\telechargements final\groupe-main\groupe-main\src\lib\supabase-service.ts:763  Code: PGRST204
error @ D:\src\client\components\globals\intercept-console-error.ts:40
createOrder @ D:\telechargements final\groupe-main\groupe-main\src\lib\supabase-service.ts:763
await in createOrder
onSubmit @ D:\telechargements final\groupe-main\groupe-main\src\app\orders\new\order-form.tsx:280
eval @ D:\telechargements final\groupe-main\groupe-main\node_modules\react-hook-form\dist\index.esm.mjs:2301
await in eval
executeDispatch @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:16501
runWithFiberInDEV @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:844
processDispatchQueue @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:16551
eval @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:17149
batchedUpdates$1 @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:3262
dispatchEventForPluginEventSystem @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:16705
dispatchEvent @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:20815
dispatchDiscreteEvent @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:20783
D:\telechargements final\groupe-main\groupe-main\src\lib\supabase-service.ts:764  Details: null
error @ D:\src\client\components\globals\intercept-console-error.ts:40
createOrder @ D:\telechargements final\groupe-main\groupe-main\src\lib\supabase-service.ts:764
await in createOrder
onSubmit @ D:\telechargements final\groupe-main\groupe-main\src\app\orders\new\order-form.tsx:280
eval @ D:\telechargements final\groupe-main\groupe-main\node_modules\react-hook-form\dist\index.esm.mjs:2301
await in eval
executeDispatch @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:16501
runWithFiberInDEV @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:844
processDispatchQueue @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:16551
eval @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:17149
batchedUpdates$1 @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:3262
dispatchEventForPluginEventSystem @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:16705
dispatchEvent @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:20815
dispatchDiscreteEvent @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:20783
D:\telechargements final\groupe-main\groupe-main\src\lib\supabase-service.ts:765  Hint: null
error @ D:\src\client\components\globals\intercept-console-error.ts:40
createOrder @ D:\telechargements final\groupe-main\groupe-main\src\lib\supabase-service.ts:765
await in createOrder
onSubmit @ D:\telechargements final\groupe-main\groupe-main\src\app\orders\new\order-form.tsx:280
eval @ D:\telechargements final\groupe-main\groupe-main\node_modules\react-hook-form\dist\index.esm.mjs:2301
await in eval
executeDispatch @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:16501
runWithFiberInDEV @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:844
processDispatchQueue @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:16551
eval @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:17149
batchedUpdates$1 @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:3262
dispatchEventForPluginEventSystem @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:16705
dispatchEvent @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:20815
dispatchDiscreteEvent @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:20783
D:\telechargements final\groupe-main\groupe-main\src\lib\supabase-service.ts:766  Détails complets: {
  "code": "PGRST204",
  "details": null,
  "hint": null,
  "message": "Could not find the 'delivery_location' column of 'orders' in the schema cache"
}
error @ D:\src\client\components\globals\intercept-console-error.ts:40
createOrder @ D:\telechargements final\groupe-main\groupe-main\src\lib\supabase-service.ts:766
await in createOrder
onSubmit @ D:\telechargements final\groupe-main\groupe-main\src\app\orders\new\order-form.tsx:280
eval @ D:\telechargements final\groupe-main\groupe-main\node_modules\react-hook-form\dist\index.esm.mjs:2301
await in eval
executeDispatch @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:16501
runWithFiberInDEV @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:844
processDispatchQueue @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:16551
eval @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:17149
batchedUpdates$1 @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:3262
dispatchEventForPluginEventSystem @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:16705
dispatchEvent @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:20815
dispatchDiscreteEvent @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:20783
D:\telechargements final\groupe-main\groupe-main\src\lib\supabase-service.ts:767  orderData envoyé: {clientId: 'new', clientName: 'test', clientPhone: '798465132', clientPhone2: '4658132', clientTaxId: '', …}
error @ D:\src\client\components\globals\intercept-console-error.ts:40
createOrder @ D:\telechargements final\groupe-main\groupe-main\src\lib\supabase-service.ts:767
await in createOrder
onSubmit @ D:\telechargements final\groupe-main\groupe-main\src\app\orders\new\order-form.tsx:280
eval @ D:\telechargements final\groupe-main\groupe-main\node_modules\react-hook-form\dist\index.esm.mjs:2301
await in eval
executeDispatch @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:16501
runWithFiberInDEV @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:844
processDispatchQueue @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:16551
eval @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:17149
batchedUpdates$1 @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:3262
dispatchEventForPluginEventSystem @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:16705
dispatchEvent @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:20815
dispatchDiscreteEvent @ D:\telechargements final\groupe-main\groupe-main\node_modules\next\dist\compiled\react-dom\cjs\react-dom-client.development.js:20783
D:\telechargements final\groupe-main\groupe-main\src\app\orders\new\order-form.tsx:294  ❌ ERREUR lors de la création: {code: 'PGRST204', details: null, hint: null, message: "Could not find the 'delivery_location' column of 'orders' in the schema cache"}