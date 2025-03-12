# Luminest

基于 Cloudflare Workers 和 R2 存储的轻量级图床服务。

## 部署步骤

1. 复制配置文件
```bash
cp wrangler.toml.example wrangler.toml
```

2. 修改 `wrangler.toml` 配置
```toml
name = "luminest"               # Worker 名称
bucket_name = "your-bucket-name"  # R2 bucket 名称（需要先在 Cloudflare 创建）
pattern = "your-domain.com"     # 你的自定义域名
R2_DOMAIN = "your-domain.com"   # 访问域名（通常与自定义域名相同）
PWD = "your-password"           # 访问密码（用于保护上传和管理功能）
```

3. 部署
```bash
npm install -g wrangler
wrangler login
npm run deploy
```

4. 访问地址：
   - 自定义域名：`https://your-domain.com/?pwd=your-password`
   - Workers 域名：`https://luminest.{username}.workers.dev/?pwd=your-password`

## Cloudflare 设置

- 确保已在 Cloudflare 中创建 R2 bucket
- 添加个人域名
- 设置适当的 CORS 策略

## 开发

```bash
npm install
npm run dev
```