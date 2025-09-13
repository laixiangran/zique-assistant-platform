import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/lib/database';

interface MallStateAttributes {
  id: number;
  mallId: string;
  mallName: string;
  regionCode?: string;
  regionName?: string;
  stateType: string;
  state: string;
  lastCollectTime?: Date;
  createdTime: Date;
  updatedTime: Date;
}

interface MallStateCreationAttributes
  extends Optional<
    MallStateAttributes,
    | 'id'
    | 'regionCode'
    | 'regionName'
    | 'lastCollectTime'
    | 'createdTime'
    | 'updatedTime'
  > {}

class MallState
  extends Model<MallStateAttributes, MallStateCreationAttributes>
  implements MallStateAttributes
{
  public id!: number;
  public mallId!: string;
  public mallName!: string;
  public regionCode?: string;
  public regionName?: string;
  public stateType!: string;
  public state!: string;
  public lastCollectTime?: Date;
  public createdTime!: Date;
  public updatedTime!: Date;
}

MallState.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    mallId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'mall_id',
      comment: '商城ID',
    },
    mallName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'mall_name',
      comment: '商城名称',
    },
    regionCode: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'region_code',
      comment: '地区代码',
    },
    regionName: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'region_name',
      comment: '地区名称',
    },
    stateType: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'state_type',
      comment: '状态类型',
    },
    state: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: '状态值',
    },
    lastCollectTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_collect_time',
      comment: '最后采集时间',
    },
    createdTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_time',
    },
    updatedTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_time',
    },
  },
  {
    sequelize,
    tableName: 'mall_state',
    timestamps: true,
    createdAt: 'createdTime',
    updatedAt: 'updatedTime',
    indexes: [
      {
        unique: true,
        fields: ['mallId', 'regionCode', 'stateType'],
        name: 'unique_mall_region_state',
      },
    ],
  }
);

export default MallState;
