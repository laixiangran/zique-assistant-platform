import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '@/lib/database';

interface PluginVersionAttributes {
  id: number;
  version: string;
  releaseDate: Date;
  downloadUrl: string;
  fileName: string;
  fileSize: number;
  description?: string;
  changelog?: string;
  isLatest: boolean;
  status: 'active' | 'inactive' | 'deprecated';
  createdTime: Date;
  updatedTime: Date;
}

interface PluginVersionCreationAttributes
  extends Optional<
    PluginVersionAttributes,
    'id' | 'description' | 'changelog' | 'createdTime' | 'updatedTime'
  > {}

class PluginVersion
  extends Model<PluginVersionAttributes, PluginVersionCreationAttributes>
  implements PluginVersionAttributes
{
  public id!: number;
  public version!: string;
  public releaseDate!: Date;
  public downloadUrl!: string;
  public fileName!: string;
  public fileSize!: number;
  public description?: string;
  public changelog?: string;
  public isLatest!: boolean;
  public status!: 'active' | 'inactive' | 'deprecated';
  public createdTime!: Date;
  public updatedTime!: Date;
}

PluginVersion.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    version: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      comment: '版本号，如 1.0.0',
    },
    releaseDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'release_date',
      comment: '发布日期',
    },
    downloadUrl: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'download_url',
      comment: '下载链接',
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'file_name',
      comment: '文件名',
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: 'file_size',
      comment: '文件大小（字节）',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '版本描述',
    },
    changelog: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '更新日志',
    },
    isLatest: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_latest',
      comment: '是否为最新版本',
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'deprecated'),
      allowNull: false,
      defaultValue: 'active',
      comment: '状态：active-活跃，inactive-非活跃，deprecated-已弃用',
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
    modelName: 'PluginVersion',
    tableName: 'plugin_versions',
    timestamps: true,
    createdAt: 'createdTime',
    updatedAt: 'updatedTime',
    indexes: [
      {
        fields: ['version'],
        unique: true,
      },
      {
        fields: ['is_latest'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['release_date'],
      },
    ],
  }
);

export default PluginVersion;
