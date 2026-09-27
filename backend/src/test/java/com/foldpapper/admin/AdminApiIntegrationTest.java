package com.foldpapper.admin;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.foldpapper.user.Role;
import com.foldpapper.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.containers.PostgreSQLContainer;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Права доступа админки, блокировка и разбор жалоб — на настоящем PostgreSQL. */
@SpringBootTest
@AutoConfigureMockMvc
class AdminApiIntegrationTest {

    /** Один контейнер на весь класс; остановит его Testcontainers (Ryuk) после прогона. */
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    static {
        postgres.start();
    }

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper json;

    @Autowired
    UserRepository userRepository;

    @Test
    void adminEndpointsRequireAdminRole() throws Exception {
        String user = register("plain");

        mvc.perform(get("/api/v1/admin/stats")).andExpect(status().isUnauthorized());
        mvc.perform(auth(get("/api/v1/admin/stats"), user)).andExpect(status().isForbidden());
    }

    @Test
    void adminSeesStatsForTwoWeeksInTheirTimezone() throws Exception {
        String admin = registerAdmin("stats_admin");

        mvc.perform(auth(get("/api/v1/admin/stats").param("tz", "Europe/Moscow"), admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activity.length()").value(14))
                .andExpect(jsonPath("$.admins").isNumber());
        mvc.perform(auth(get("/api/v1/admin/stats").param("tz", "Mars/Olympus"), admin))
                .andExpect(status().isBadRequest());
    }

    @Test
    void demotionTakesEffectImmediatelyWithTheSameToken() throws Exception {
        String admin = registerAdmin("boss");
        String deputy = registerAdmin("deputy");

        mvc.perform(auth(get("/api/v1/admin/stats"), deputy)).andExpect(status().isOk());
        mvc.perform(auth(patch("/api/v1/admin/users/" + userId("deputy")), admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"USER\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("USER"));

        mvc.perform(auth(get("/api/v1/admin/stats"), deputy)).andExpect(status().isForbidden());
    }

    @Test
    void bannedUserLosesSessionAndCannotLogIn() throws Exception {
        String admin = registerAdmin("banhammer");
        String troll = register("troll");

        banned(admin, "troll", true, "спам").andExpect(status().isOk())
                .andExpect(jsonPath("$.banReason").value("спам"));

        mvc.perform(auth(get("/api/v1/users/me"), troll))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Аккаунт заблокирован"));
        mvc.perform(post("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"login\":\"troll\",\"password\":\"password123\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Аккаунт заблокирован: спам"));

        banned(admin, "troll", false, null).andExpect(status().isOk());
        mvc.perform(auth(get("/api/v1/users/me"), troll)).andExpect(status().isOk());
    }

    @Test
    void adminCannotBanOrDemoteThemselves() throws Exception {
        String admin = registerAdmin("self_admin");

        banned(admin, "self_admin", true, null).andExpect(status().isBadRequest());
    }

    @Test
    void reportIsResolvedByDeletingPinAndBoardCounterDrops() throws Exception {
        String admin = registerAdmin("moderator");
        String author = register("author");
        String reader = register("reader");

        String boardId = field(mvc.perform(auth(post("/api/v1/boards"), author)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Доска\"}"))
                .andExpect(status().isCreated()), "id");
        String pinId = field(mvc.perform(auth(post("/api/v1/pins"), author)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"imageUrl\":\"https://example.com/a.jpg\",\"boardId\":\"" + boardId + "\"}"))
                .andExpect(status().isCreated()), "id");

        String report = "{\"reason\":\"SPAM\",\"comment\":\"реклама\"}";
        mvc.perform(auth(post("/api/v1/pins/" + pinId + "/reports"), author)
                        .contentType(MediaType.APPLICATION_JSON).content(report))
                .andExpect(status().isBadRequest());
        mvc.perform(auth(post("/api/v1/pins/" + pinId + "/reports"), reader)
                        .contentType(MediaType.APPLICATION_JSON).content(report))
                .andExpect(status().isCreated());
        mvc.perform(auth(post("/api/v1/pins/" + pinId + "/reports"), reader)
                        .contentType(MediaType.APPLICATION_JSON).content(report))
                .andExpect(status().isConflict());

        JsonNode open = body(mvc.perform(auth(get("/api/v1/admin/reports"), admin)).andExpect(status().isOk()));
        JsonNode mine = find(open.get("items"), pinId);
        assertThat(mine.get("pin").get("openReports").asLong()).isEqualTo(1);

        mvc.perform(auth(post("/api/v1/admin/reports/" + mine.get("id").asText() + "/resolve"), admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"DELETE_PIN\"}"))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/v1/pins/" + pinId)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/boards/" + boardId).header("Authorization", "Bearer " + author))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pinCount").value(0));

        JsonNode resolved = body(mvc.perform(auth(get("/api/v1/admin/reports").param("status", "RESOLVED"), admin)));
        boolean found = false;
        for (JsonNode item : resolved.get("items")) {
            if (item.get("id").asText().equals(mine.get("id").asText())) {
                found = true;
                assertThat(item.hasNonNull("pin")).isFalse();
                assertThat(item.get("pinImageUrl").asText()).isEqualTo("https://example.com/a.jpg");
                assertThat(item.get("resolvedBy").get("username").asText()).isEqualTo("moderator");
            }
        }
        assertThat(found).isTrue();
    }

    @Test
    void adminCanDeleteAnyPin() throws Exception {
        String admin = registerAdmin("cleaner");
        String author = register("someone");
        String pinId = field(mvc.perform(auth(post("/api/v1/pins"), author)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"imageUrl\":\"https://example.com/b.jpg\"}"))
                .andExpect(status().isCreated()), "id");

        mvc.perform(auth(delete("/api/v1/pins/" + pinId), register("stranger"))).andExpect(status().isForbidden());
        mvc.perform(auth(delete("/api/v1/admin/pins/" + pinId), admin)).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/pins/" + pinId)).andExpect(status().isNotFound());
    }

    // ---------------------------------------------------------------- helpers

    private String register(String username) throws Exception {
        String body = "{\"username\":\"%s\",\"email\":\"%s@test.dev\",\"password\":\"password123\"}"
                .formatted(username, username);
        return field(mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()), "accessToken");
    }

    private String registerAdmin(String username) throws Exception {
        String token = register(username);
        var user = userRepository.findByUsernameIgnoreCase(username).orElseThrow();
        user.setRole(Role.ADMIN);
        userRepository.save(user);
        return token;
    }

    private UUID userId(String username) {
        return userRepository.findByUsernameIgnoreCase(username).orElseThrow().getId();
    }

    private org.springframework.test.web.servlet.ResultActions banned(String adminToken, String username,
                                                                      boolean banned, String reason) throws Exception {
        String body = reason == null
                ? "{\"banned\":%s}".formatted(banned)
                : "{\"banned\":%s,\"banReason\":\"%s\"}".formatted(banned, reason);
        return mvc.perform(auth(patch("/api/v1/admin/users/" + userId(username)), adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private static MockHttpServletRequestBuilder auth(MockHttpServletRequestBuilder request, String token) {
        return request.header("Authorization", "Bearer " + token);
    }

    private JsonNode body(org.springframework.test.web.servlet.ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsString());
    }

    private String field(org.springframework.test.web.servlet.ResultActions result, String name) throws Exception {
        return body(result).get(name).asText();
    }

    private static JsonNode find(JsonNode reports, String pinId) {
        for (JsonNode item : reports) {
            if (item.hasNonNull("pin") && item.get("pin").get("id").asText().equals(pinId)) {
                return item;
            }
        }
        throw new AssertionError("Жалоба на пин " + pinId + " не найдена");
    }
}
