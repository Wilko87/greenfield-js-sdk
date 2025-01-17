import { MsgGrantAllowanceSDKTypeEIP712 } from '@/messages/feegrant/MsgGrantAllowance';
import { MsgRevokeAllowanceSDKTypeEIP712 } from '@/messages/feegrant/MsgRevokeAllowance';
import {
  QueryAllowanceRequest,
  QueryAllowanceResponse,
  QueryAllowancesRequest,
  QueryAllowancesResponse,
} from '@bnb-chain/greenfield-cosmos-types/cosmos/feegrant/v1beta1/query';
import {
  MsgGrantAllowance,
  MsgRevokeAllowance,
} from '@bnb-chain/greenfield-cosmos-types/cosmos/feegrant/v1beta1/tx';
import { base64FromBytes, bytesFromBase64 } from '@bnb-chain/greenfield-cosmos-types/helpers';
import { toBuffer } from '@ethereumjs/util';
import { container, singleton } from 'tsyringe';
import {
  encodeToHex,
  IGrantAllowance,
  MsgGrantAllowanceTypeUrl,
  MsgRevokeAllowanceTypeUrl,
  newAllowedMsgAllowance,
  newBasicAllowance,
  newMarshal,
  newMsgGrantAllowance,
  TxResponse,
} from '..';
import { Basic } from './basic';
import { RpcQueryClient } from './queryclient';

export interface IFeeGrant {
  grantAllowance(msg: IGrantAllowance): Promise<TxResponse>;

  revokeAllowance(msg: MsgRevokeAllowance): Promise<TxResponse>;

  getAllowence(request: QueryAllowanceRequest): Promise<QueryAllowanceResponse>;

  getAllowences(request: QueryAllowancesRequest): Promise<QueryAllowancesResponse>;
}

@singleton()
export class FeeGrant implements IFeeGrant {
  private basic: Basic = container.resolve(Basic);
  private queryClient: RpcQueryClient = container.resolve(RpcQueryClient);

  public async grantAllowance(params: IGrantAllowance) {
    const { amount, denom, allowedMessages, grantee, granter } = params;

    const basicAllowance = newBasicAllowance(amount, denom);
    const allowedMsgAllowance = newAllowedMsgAllowance(allowedMessages, basicAllowance);
    const grantAllowance = newMsgGrantAllowance(grantee, granter, allowedMsgAllowance);
    const marshal = newMarshal(amount, denom, allowedMessages);

    return await this.basic.tx(
      MsgGrantAllowanceTypeUrl,
      granter,
      MsgGrantAllowanceSDKTypeEIP712,
      {
        ...MsgGrantAllowance.toSDK(grantAllowance),
        allowance: {
          type: grantAllowance.allowance?.typeUrl,
          value: base64FromBytes(toBuffer('0x' + encodeToHex(JSON.stringify(marshal)))),
        },
      },
      MsgGrantAllowance.encode(grantAllowance).finish(),
    );
  }

  public async revokeAllowance(msg: MsgRevokeAllowance) {
    return await this.basic.tx(
      MsgRevokeAllowanceTypeUrl,
      msg.granter,
      MsgRevokeAllowanceSDKTypeEIP712,
      MsgRevokeAllowance.toSDK(msg),
      MsgRevokeAllowance.encode(msg).finish(),
    );
  }

  public async getAllowence(request: QueryAllowanceRequest) {
    const rpc = await this.queryClient.getFeeGrantQueryClient();
    return await rpc.Allowance(request);
  }

  public async getAllowences(request: QueryAllowancesRequest) {
    const rpc = await this.queryClient.getFeeGrantQueryClient();
    return await rpc.Allowances(request);
  }
}
