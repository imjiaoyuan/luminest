# Luminest

基于 Cloudflare Workers 和 R2 存储的轻量级图床服务。

## 部署步骤

1. 复制配置文件
```bash
cp wrangler.toml.example wrangler.toml
```

2. 修改 `wrangler.toml` 配置
```toml
name = "r2-picbed"              # Worker 名称
bucket_name = "images"          # R2 bucket 名称
R2_DOMAIN = "your-domain.com"   # R2 自定义域名
PWD = "your-password"           # 访问密码
```

3. 部署
```bash
npm install -g wrangler
wrangler login
npm run deploy
```

4. 访问地址：`https://your-worker.dev/?pwd=your-password`

## Cloudflare 设置

- 确保已在 Cloudflare 中创建 R2 bucket
- 配置自定义域名（可选）
- 设置适当的 CORS 策略。

## 开发

```bash
npm install
npm run dev
```