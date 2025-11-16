// 专辑详情
module.exports =  (params, useAxios) => {
  console.log('album_detail.js - params:', params);
  // 支持从params和body中获取id参数
  const id = params.id || (params.body && params.body.id);
  const data = { data: [{ album_id: id }], is_buy: params?.is_buy || 0 };
  return useAxios({
    url: '/kmr/v2/albums',
    method: 'POST',
    data,
    encryptType: 'android',
    cookie: params?.cookie || {},
    headers: { 'x-router': 'openapi.kugou.com', 'kg-tid': '255' },
  }).then(response => {
    console.log('album_detail.js - response:', response);
    return response;
  });
}
