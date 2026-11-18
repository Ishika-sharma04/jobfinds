export const sourceStatuses:Record<string,{status:string;items:number;error?:string}>={};
export function sourceErrorMessage(error:unknown){
 const value=error as {response?:{status?:number};code?:string};
 if(value?.response?.status)return `HTTP ${value.response.status}`;
 if(value?.code&&/^(ECONNABORTED|ETIMEDOUT|ECONNRESET|ENOTFOUND)$/i.test(value.code))return 'Network timeout or connection error';
 return 'Source request failed; inspect server logs for details';
}
